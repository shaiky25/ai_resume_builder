import { describe, expect, it, vi } from "vitest";
import {
  CHAT_CREDIT_COST,
  handleChatRequest,
  type ChatRequestDependencies,
} from "./handleChatRequest";
import type { CreditsGateway, ReserveResult } from "./credits";
import type { ResumeContextGateway, ResumeContext } from "./resumeContext";
import type { LogSuccessParams, UsageLogger } from "./usageLogger";
import type {
  ChatModelClient,
  ChatStream,
  ChatStreamEvent,
  StreamChatParams,
} from "./anthropicClient";
import type { RateLimiter } from "./rateLimiter";
import type { AuthenticatedUser } from "@/lib/supabase/serverClient";

const VALID_AUTH_HEADER = "Bearer valid-token";
const USER_ID = "user-1";

// ---------------------------------------------------------------------------
// Test doubles. These implement the same narrow gateway interfaces the real
// Supabase-backed and Anthropic-backed classes implement, so handleChatRequest
// is exercised through its real dependency-injection seam rather than via
// deep-mocking the Supabase/Anthropic SDK client objects. No network is ever
// touched.
// ---------------------------------------------------------------------------

interface LedgerEntry {
  userId: string;
  requestId: string;
  amount: number;
  reason: string;
}

/**
 * In-memory fake modeling the `reserve_chat_credit` Postgres function.
 * Critically, `reserve()` performs its balance check-and-decrement
 * synchronously (no `await` between reading and writing the balance) —
 * this is what makes it an honest model of a single atomic SQL
 * `UPDATE ... WHERE credits_remaining >= cost` statement: two concurrent
 * JS calls cannot interleave between the check and the write, exactly as
 * two concurrent Postgres transactions cannot interleave inside one atomic
 * UPDATE. A naive read-then-write implementation (with an `await` in
 * between) would let both concurrent calls read the same starting balance
 * and both "succeed" — that bug is exactly what test 8.3 below would catch.
 */
function createFakeCreditsGateway(initialBalances: Record<string, number>) {
  const balances = new Map<string, number>(Object.entries(initialBalances));
  const ledger: LedgerEntry[] = [];

  const getCreditsRemaining = vi.fn(async (userId: string): Promise<number | null> => {
    return balances.has(userId) ? (balances.get(userId) as number) : null;
  });

  const reserve = vi.fn(
    async (userId: string, requestId: string, cost: number): Promise<ReserveResult> => {
      const current = balances.get(userId) ?? 0;
      if (current < cost) {
        return { success: false, newBalance: current };
      }
      const newBalance = current - cost;
      balances.set(userId, newBalance);
      ledger.push({ userId, requestId, amount: cost, reason: "reservation" });
      return { success: true, newBalance };
    }
  );

  const refund = vi.fn(
    async (userId: string, requestId: string, amount: number, reason: string): Promise<void> => {
      const current = balances.get(userId) ?? 0;
      balances.set(userId, current + amount);
      ledger.push({ userId, requestId, amount: -amount, reason });
    }
  );

  const gateway: CreditsGateway = { getCreditsRemaining, reserve, refund };
  return { gateway, balances, ledger };
}

function createFakeResumeContextGateway(context: ResumeContext | null = null) {
  const getLatestResumeContext = vi.fn(async (): Promise<ResumeContext | null> => context);
  const gateway: ResumeContextGateway = { getLatestResumeContext };
  return gateway;
}

function createFakeUsageLogger() {
  const calls: LogSuccessParams[] = [];
  const logSuccess = vi.fn(async (params: LogSuccessParams): Promise<void> => {
    calls.push(params);
  });
  const logger: UsageLogger = { logSuccess };
  return { logger, calls };
}

function createFakeRateLimiter(allow: boolean) {
  const check = vi.fn(() => allow);
  const limiter: RateLimiter = { check };
  return limiter;
}

function createFakeVerifyUser(user: AuthenticatedUser | null) {
  return vi.fn(async (authHeader: string | null): Promise<AuthenticatedUser | null> => {
    if (authHeader !== VALID_AUTH_HEADER) return null;
    return user;
  });
}

interface FakeModelClientOptions {
  /** If true, the returned stream throws while iterating (simulated Claude API error). */
  failDuringStream?: boolean;
  textChunks?: string[];
}

function createFakeModelClient(options: FakeModelClientOptions = {}) {
  const { failDuringStream = false, textChunks = ["Great work, ", "here's a bullet point."] } =
    options;
  const calls: StreamChatParams[] = [];

  const streamChat = vi.fn((params: StreamChatParams): ChatStream => {
    calls.push(params);

    async function* events(): AsyncGenerator<ChatStreamEvent> {
      if (failDuringStream) {
        throw new Error("simulated Claude API error");
      }
      for (const text of textChunks) {
        yield { type: "text_delta", text };
      }
    }

    return {
      events: events(),
      finalUsage: async () => {
        if (failDuringStream) {
          throw new Error("simulated Claude API error");
        }
        return { inputTokens: 123, outputTokens: 45 };
      },
    };
  });

  const client: ChatModelClient = { streamChat };
  return { client, calls };
}

function makeRequest(options: { authHeader?: string | null; body?: unknown } = {}): Request {
  const headers = new Headers();
  if (options.authHeader !== null) {
    headers.set("authorization", options.authHeader ?? VALID_AUTH_HEADER);
  }
  headers.set("content-type", "application/json");
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers,
    body: JSON.stringify(options.body ?? { message: "Help me rewrite this bullet point." }),
  });
}

async function readBodyToText(response: Response): Promise<string> {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
  }
  return text;
}

function buildDeps(overrides: Partial<ChatRequestDependencies>): ChatRequestDependencies {
  let counter = 0;
  return {
    verifyUser: createFakeVerifyUser({ id: USER_ID }),
    rateLimiter: createFakeRateLimiter(true),
    creditsGateway: createFakeCreditsGateway({ [USER_ID]: 5 }).gateway,
    resumeContextGateway: createFakeResumeContextGateway(null),
    usageLogger: createFakeUsageLogger().logger,
    modelClient: createFakeModelClient().client,
    generateRequestId: () => `req-${counter++}`,
    ...overrides,
  };
}

describe("handleChatRequest", () => {
  // 8.1 — unauthenticated request is rejected before any credit/Claude logic
  it("rejects an unauthenticated request before any credit or Claude logic runs", async () => {
    const { gateway: creditsGateway } = createFakeCreditsGateway({ [USER_ID]: 5 });
    const rateLimiter = createFakeRateLimiter(true);
    const { client: modelClient, calls: modelCalls } = createFakeModelClient();

    const deps = buildDeps({
      verifyUser: createFakeVerifyUser(null), // simulate missing/invalid JWT
      rateLimiter,
      creditsGateway,
      modelClient,
    });

    const response = await handleChatRequest(makeRequest({ authHeader: null }), deps);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("unauthenticated");

    expect(rateLimiter.check).not.toHaveBeenCalled();
    expect(creditsGateway.getCreditsRemaining).not.toHaveBeenCalled();
    expect(creditsGateway.reserve).not.toHaveBeenCalled();
    expect(modelCalls).toHaveLength(0);
  });

  // 8.2 — insufficient-credit request returns 403 with no Claude call and no balance change
  it("returns 403 out_of_credits with no Claude call and no balance change when credits are insufficient", async () => {
    const { gateway: creditsGateway, balances } = createFakeCreditsGateway({ [USER_ID]: 0 });
    const { client: modelClient, calls: modelCalls } = createFakeModelClient();

    const deps = buildDeps({ creditsGateway, modelClient });

    const response = await handleChatRequest(makeRequest(), deps);

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe("out_of_credits");

    expect(modelCalls).toHaveLength(0);
    expect(creditsGateway.reserve).not.toHaveBeenCalled();
    expect(balances.get(USER_ID)).toBe(0);
  });

  // 8.3 — concurrent requests from a user with exactly one credit only let one succeed
  it("only lets one of two concurrent requests succeed when the user has exactly one credit", async () => {
    const { gateway: creditsGateway, balances, ledger } = createFakeCreditsGateway({
      [USER_ID]: 1,
    });
    const { client: modelClient } = createFakeModelClient();
    const { logger: usageLogger } = createFakeUsageLogger();

    const deps = buildDeps({ creditsGateway, modelClient, usageLogger });

    const [responseA, responseB] = await Promise.all([
      handleChatRequest(makeRequest(), deps),
      handleChatRequest(makeRequest(), deps),
    ]);

    // Drain any streaming bodies so the async completion logic (including
    // usage logging) has finished before we assert on final state.
    await Promise.all([readBodyToText(responseA), readBodyToText(responseB)]);

    const statuses = [responseA.status, responseB.status].sort((a, b) => a - b);
    expect(statuses).toEqual([200, 403]);

    // Exactly one reservation ever got through, and the balance reflects
    // exactly one successful decrement — not two, not a negative balance.
    expect(balances.get(USER_ID)).toBe(0);
    expect(ledger.filter((entry) => entry.reason === "reservation")).toHaveLength(1);
  });

  // 8.4 — simulated Claude error after reservation results in a refund ledger entry
  it("refunds the reserved credit when the Claude call errors after reservation", async () => {
    const { gateway: creditsGateway, balances, ledger } = createFakeCreditsGateway({
      [USER_ID]: 5,
    });
    const { client: modelClient } = createFakeModelClient({ failDuringStream: true });

    const deps = buildDeps({ creditsGateway, modelClient });

    const response = await handleChatRequest(makeRequest(), deps);

    // The stream opens successfully (200) — the simulated error happens
    // while consuming it, which is the harder of the two failure points to
    // handle correctly (the easier one being a synchronous throw before any
    // response is returned).
    expect(response.status).toBe(200);

    const bodyText = await readBodyToText(response);
    expect(bodyText).toContain("event: error");

    // Reservation debited the balance, then the compensating refund
    // restored it — net balance is unchanged from the starting 5.
    expect(balances.get(USER_ID)).toBe(5);

    const refundEntries = ledger.filter((entry) => entry.amount < 0);
    expect(refundEntries).toHaveLength(1);
    expect(refundEntries[0]?.amount).toBe(-CHAT_CREDIT_COST);
    expect(refundEntries[0]?.reason).toBe("claude_stream_error");
  });

  // 8.5 — rate-limited user is rejected even with sufficient credits
  it("rejects a rate-limited user even with sufficient credits, before any credit reservation or Claude call", async () => {
    const { gateway: creditsGateway } = createFakeCreditsGateway({ [USER_ID]: 5 });
    const { client: modelClient, calls: modelCalls } = createFakeModelClient();
    const rateLimiter = createFakeRateLimiter(false);

    const deps = buildDeps({ creditsGateway, modelClient, rateLimiter });

    const response = await handleChatRequest(makeRequest(), deps);

    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body.error).toBe("rate_limited");

    expect(creditsGateway.getCreditsRemaining).not.toHaveBeenCalled();
    expect(creditsGateway.reserve).not.toHaveBeenCalled();
    expect(modelCalls).toHaveLength(0);
  });
});
