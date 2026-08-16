import { describe, expect, it, vi } from "vitest";
import {
  CHAT_CREDIT_COST,
  handleChatRequest,
  type ChatRequestDependencies,
} from "./handleChatRequest";
import type { CreditsGateway, ReserveResult } from "./credits";
import type { ResumeContextGateway, ResumeContext } from "./resumeContext";
import type { ProfileGateway } from "./profileGateway";
import type { LogSuccessParams, UsageLogger } from "./usageLogger";
import type {
  ChatModelClient,
  ChatStream,
  ChatStreamEvent,
  StreamChatParams,
} from "./anthropicClient";
import type { ResumeExtractionModelClient } from "./resumeExtraction";
import type { TailoringStrategyModelClient } from "./tailoringStrategy";
import type { SatisfactionSignalModelClient } from "./satisfactionSignal";
import type { ChatTurnInput } from "./types";
import type { RateLimiter } from "./rateLimiter";
import type { AuthenticatedUser } from "@/lib/supabase/serverClient";
import type { ResumeDraft } from "@/types/resume";
import type { CoachPersona } from "@/types/chat";

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

/**
 * In-memory fake modeling `persistStructuredOutput`'s user_id scoping: each
 * write is keyed by the `userId` argument the caller passed, exactly like
 * the real implementation's `.eq("user_id", userId)` scoping on both the
 * lookup and the write — so a bug that passed the wrong user id would show
 * up here as data landing under the wrong key (1.7).
 */
function createFakeResumeContextGateway(context: ResumeContext | null = null) {
  const persisted = new Map<string, unknown>();
  const persistedBaselineAssessments = new Map<string, unknown>();
  const persistedTailoringStrategies = new Map<string, unknown>();
  const persistedSatisfactionSignals = new Map<
    string,
    { optimizationSatisfied?: boolean; exportRequested?: boolean }
  >();
  const getLatestResumeContext = vi.fn(async (): Promise<ResumeContext | null> => context);
  const persistStructuredOutput = vi.fn(async (userId: string, structuredOutput: unknown) => {
    persisted.set(userId, structuredOutput);
  });
  const persistBaselineAssessment = vi.fn(async (userId: string, baselineAssessment: unknown) => {
    persistedBaselineAssessments.set(userId, baselineAssessment);
  });
  const persistTailoringStrategy = vi.fn(async (userId: string, tailoringStrategy: unknown) => {
    persistedTailoringStrategies.set(userId, tailoringStrategy);
  });
  const persistSatisfactionSignal = vi.fn(
    async (
      userId: string,
      signal: { optimizationSatisfied?: boolean; exportRequested?: boolean }
    ) => {
      persistedSatisfactionSignals.set(userId, signal);
    }
  );
  const gateway: ResumeContextGateway = {
    getLatestResumeContext,
    persistStructuredOutput,
    persistBaselineAssessment,
    persistTailoringStrategy,
    persistSatisfactionSignal,
  };
  return {
    gateway,
    persisted,
    persistedBaselineAssessments,
    persistedTailoringStrategies,
    persistedSatisfactionSignals,
  };
}

function createFakeProfileGateway(coachPersona: CoachPersona | null = null) {
  const getCoachPersona = vi.fn(async (): Promise<CoachPersona | null> => coachPersona);
  const gateway: ProfileGateway = { getCoachPersona };
  return gateway;
}

function createFakeTailoringStrategyClient() {
  const client: TailoringStrategyModelClient = {
    deriveBaselineAssessment: vi.fn(async () => null),
    deriveTailoringStrategy: vi.fn(async () => null),
  };
  return client;
}

function createFakeSatisfactionSignalClient() {
  const client: SatisfactionSignalModelClient = {
    deriveSatisfactionSignal: vi.fn(async () => null),
  };
  return client;
}

interface FakeResumeExtractionClientOptions {
  result?: ResumeDraft | null;
  throws?: boolean;
}

function createFakeResumeExtractionClient(options: FakeResumeExtractionClientOptions = {}) {
  const { result = null, throws = false } = options;
  const calls: ChatTurnInput[][] = [];

  const extractResume = vi.fn(async (conversation: ChatTurnInput[]): Promise<ResumeDraft | null> => {
    calls.push(conversation);
    if (throws) {
      throw new Error("simulated extraction failure");
    }
    return result;
  });

  const client: ResumeExtractionModelClient = { extractResume };
  return { client, calls };
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
    resumeContextGateway: createFakeResumeContextGateway(null).gateway,
    profileGateway: createFakeProfileGateway(null),
    usageLogger: createFakeUsageLogger().logger,
    modelClient: createFakeModelClient().client,
    resumeExtractionClient: createFakeResumeExtractionClient().client,
    tailoringStrategyClient: createFakeTailoringStrategyClient(),
    satisfactionSignalClient: createFakeSatisfactionSignalClient(),
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

  // 1.5 — successful turn persists structured_output for the correct user
  it("persists extracted structured_output for the correct user after a successful turn", async () => {
    const extracted: ResumeDraft = {
      name: "Jordan Rivera",
      title: "Senior Backend Engineer",
      summary: "Backend engineer.",
      experience: [{ company: "Acme", role: "Engineer", description: "Did things." }],
    };
    const { gateway: resumeContextGateway, persisted } = createFakeResumeContextGateway(null);
    const { client: resumeExtractionClient, calls: extractionCalls } =
      createFakeResumeExtractionClient({ result: extracted });

    const deps = buildDeps({ resumeContextGateway, resumeExtractionClient });

    const response = await handleChatRequest(makeRequest(), deps);
    await readBodyToText(response);

    await vi.waitFor(() => {
      expect(persisted.get(USER_ID)).toEqual(extracted);
    });

    expect(extractionCalls).toHaveLength(1);
    expect(extractionCalls[0]).toEqual([
      { role: "user", content: "Help me rewrite this bullet point." },
      { role: "assistant", content: "Great work, here's a bullet point." },
    ]);
  });

  // 1.6 — extraction failure does not alter the already-delivered chat
  // response and does not write partial/corrupt structured_output
  it("does not alter the delivered chat response or persist anything when extraction fails", async () => {
    const { gateway: resumeContextGateway, persisted } = createFakeResumeContextGateway(null);
    const { client: resumeExtractionClient, calls: extractionCalls } =
      createFakeResumeExtractionClient({ throws: true });

    const deps = buildDeps({ resumeContextGateway, resumeExtractionClient });

    const response = await handleChatRequest(makeRequest(), deps);
    expect(response.status).toBe(200);

    const bodyText = await readBodyToText(response);
    expect(bodyText).toContain(
      `event: message\ndata: ${JSON.stringify({ text: "Great work, " })}`
    );
    expect(bodyText).toContain(
      `event: message\ndata: ${JSON.stringify({ text: "here's a bullet point." })}`
    );
    expect(bodyText).toContain("event: done");
    expect(bodyText).not.toContain("event: error");

    await vi.waitFor(() => {
      expect(extractionCalls).toHaveLength(1);
    });

    expect(persisted.size).toBe(0);
  });

  // 1.7 — extraction output for one user is never written to another
  // user's resumes row
  it("scopes persisted structured_output to the requesting user, never another user's row", async () => {
    const { gateway: resumeContextGateway, persisted } = createFakeResumeContextGateway(null);

    const userAResume: ResumeDraft = {
      name: "User A",
      title: "",
      summary: "",
      experience: [],
    };
    const userBResume: ResumeDraft = {
      name: "User B",
      title: "",
      summary: "",
      experience: [],
    };

    const creditsGateway = createFakeCreditsGateway({ "user-a": 5, "user-b": 5 }).gateway;

    const depsA = buildDeps({
      resumeContextGateway,
      creditsGateway,
      verifyUser: createFakeVerifyUser({ id: "user-a" }),
      resumeExtractionClient: createFakeResumeExtractionClient({ result: userAResume }).client,
    });
    const depsB = buildDeps({
      resumeContextGateway,
      creditsGateway,
      verifyUser: createFakeVerifyUser({ id: "user-b" }),
      resumeExtractionClient: createFakeResumeExtractionClient({ result: userBResume }).client,
    });

    const [responseA, responseB] = await Promise.all([
      handleChatRequest(makeRequest(), depsA),
      handleChatRequest(makeRequest(), depsB),
    ]);
    await Promise.all([readBodyToText(responseA), readBodyToText(responseB)]);

    await vi.waitFor(() => {
      expect(persisted.get("user-a")).toEqual(userAResume);
      expect(persisted.get("user-b")).toEqual(userBResume);
    });

    // Each user's persisted output is exactly their own — never swapped or
    // merged across the two concurrent requests.
    expect(persisted.get("user-a")).not.toEqual(userBResume);
    expect(persisted.get("user-b")).not.toEqual(userAResume);
    expect(persisted.size).toBe(2);
  });

  // 3.1/3.11 — tailoring-strategy derivation is skipped entirely when the
  // user has no target job set
  it("does not derive a tailoring strategy when no target job is set", async () => {
    const { gateway: resumeContextGateway } = createFakeResumeContextGateway(null);
    const tailoringStrategyClient = createFakeTailoringStrategyClient();

    const deps = buildDeps({ resumeContextGateway, tailoringStrategyClient });

    const response = await handleChatRequest(makeRequest(), deps);
    await readBodyToText(response);

    await vi.waitFor(() => {
      expect(tailoringStrategyClient.deriveBaselineAssessment).not.toHaveBeenCalled();
    });
    expect(tailoringStrategyClient.deriveTailoringStrategy).not.toHaveBeenCalled();
  });

  // 3.3 — baseline assessment is derived first when a target job is set but
  // no baseline exists yet, and rewrite guidance is deferred that turn
  it("derives only the baseline assessment when a target job is newly set", async () => {
    const context: ResumeContext = {
      rawText: null,
      structuredOutput: { name: "Jordan" },
      targetJob: { title: "Backend Engineer", company: "Acme", description: "Build APIs." },
      baselineAssessment: null,
      tailoringStrategy: null,
    };
    const { gateway: resumeContextGateway, persistedBaselineAssessments } =
      createFakeResumeContextGateway(context);
    const tailoringStrategyClient = createFakeTailoringStrategyClient();
    (tailoringStrategyClient.deriveBaselineAssessment as ReturnType<typeof vi.fn>).mockResolvedValue({
      matchScore: 60,
      missingKeywords: ["Kubernetes"],
      redFlags: ["Unquantified bullet"],
    });

    const deps = buildDeps({ resumeContextGateway, tailoringStrategyClient });

    const response = await handleChatRequest(makeRequest(), deps);
    await readBodyToText(response);

    await vi.waitFor(() => {
      expect(persistedBaselineAssessments.get(USER_ID)).toEqual({
        matchScore: 60,
        missingKeywords: ["Kubernetes"],
        redFlags: ["Unquantified bullet"],
      });
    });
    expect(tailoringStrategyClient.deriveTailoringStrategy).not.toHaveBeenCalled();
  });

  // 3.1 — once a baseline exists, subsequent turns derive the full
  // tailoring strategy instead
  it("derives the tailoring strategy once a baseline assessment already exists", async () => {
    const context: ResumeContext = {
      rawText: null,
      structuredOutput: { name: "Jordan" },
      targetJob: { title: "Backend Engineer", company: "Acme", description: "Build APIs." },
      baselineAssessment: { matchScore: 60, missingKeywords: [], redFlags: [] },
      tailoringStrategy: null,
    };
    const { gateway: resumeContextGateway, persistedTailoringStrategies } =
      createFakeResumeContextGateway(context);
    const tailoringStrategyClient = createFakeTailoringStrategyClient();
    (tailoringStrategyClient.deriveTailoringStrategy as ReturnType<typeof vi.fn>).mockResolvedValue({
      lowRelevance: false,
      matchedKeywords: ["APIs"],
      missingKeywords: [],
      prioritizedGaps: [],
      rewriteGuidance: ["Ship APIs, measured by uptime, via on-call rotation."],
    });

    const deps = buildDeps({ resumeContextGateway, tailoringStrategyClient });

    const response = await handleChatRequest(makeRequest(), deps);
    await readBodyToText(response);

    await vi.waitFor(() => {
      expect(persistedTailoringStrategies.get(USER_ID)).toBeDefined();
    });
    expect(tailoringStrategyClient.deriveBaselineAssessment).not.toHaveBeenCalled();
  });

  // 3.10 — a tailoring-strategy derivation failure never alters the
  // already-delivered chat response
  it("does not alter the delivered chat response when tailoring strategy derivation fails", async () => {
    const context: ResumeContext = {
      rawText: null,
      structuredOutput: { name: "Jordan" },
      targetJob: { title: "Backend Engineer", company: "Acme", description: "Build APIs." },
      baselineAssessment: { matchScore: 60, missingKeywords: [], redFlags: [] },
      tailoringStrategy: null,
    };
    const { gateway: resumeContextGateway } = createFakeResumeContextGateway(context);
    const tailoringStrategyClient: TailoringStrategyModelClient = {
      deriveBaselineAssessment: vi.fn(async () => null),
      deriveTailoringStrategy: vi.fn(async () => {
        throw new Error("simulated derivation failure");
      }),
    };

    const deps = buildDeps({ resumeContextGateway, tailoringStrategyClient });

    const response = await handleChatRequest(makeRequest(), deps);
    expect(response.status).toBe(200);

    const bodyText = await readBodyToText(response);
    expect(bodyText).toContain("event: done");
    expect(bodyText).not.toContain("event: error");

    await vi.waitFor(() => {
      expect(tailoringStrategyClient.deriveTailoringStrategy).toHaveBeenCalled();
    });
  });

  // 7.2 — the target job description and tailoring strategy never leak into
  // the client-visible SSE response, same secrecy guarantee as the Master
  // Prompt itself (the composed system prompt is only ever handed to
  // deps.modelClient.streamChat, never serialized into the response body).
  it("never includes the target job description or tailoring strategy in the response body", async () => {
    const context: ResumeContext = {
      rawText: null,
      structuredOutput: { name: "Jordan" },
      targetJob: {
        title: "Backend Engineer",
        company: "Acme",
        description: "SECRET_JOB_DESCRIPTION_TEXT",
      },
      baselineAssessment: { matchScore: 60, missingKeywords: [], redFlags: [] },
      tailoringStrategy: {
        lowRelevance: false,
        matchedKeywords: [],
        missingKeywords: [],
        prioritizedGaps: [],
        rewriteGuidance: ["SECRET_REWRITE_GUIDANCE_TEXT"],
      },
    };
    const { gateway: resumeContextGateway } = createFakeResumeContextGateway(context);

    const deps = buildDeps({ resumeContextGateway });

    const response = await handleChatRequest(makeRequest(), deps);
    const bodyText = await readBodyToText(response);

    expect(bodyText).not.toContain("SECRET_JOB_DESCRIPTION_TEXT");
    expect(bodyText).not.toContain("SECRET_REWRITE_GUIDANCE_TEXT");
  });

  // 3.14/3.15 — an explicit export request persists both the export-request
  // and satisfaction flags
  it("persists export-requested and satisfaction flags when the user explicitly asks to export", async () => {
    const { gateway: resumeContextGateway, persistedSatisfactionSignals } =
      createFakeResumeContextGateway(null);
    const satisfactionSignalClient: SatisfactionSignalModelClient = {
      deriveSatisfactionSignal: vi.fn(async () => ({
        explicitExportRequested: true,
        satisfiedFromReadiness: false,
      })),
    };

    const deps = buildDeps({ resumeContextGateway, satisfactionSignalClient });

    const response = await handleChatRequest(makeRequest(), deps);
    await readBodyToText(response);

    await vi.waitFor(() => {
      expect(persistedSatisfactionSignals.get(USER_ID)).toEqual({
        optimizationSatisfied: true,
        exportRequested: true,
      });
    });
  });

  // 6.4 (coach-persona-onboarding) — the composed prompt reflects the
  // server-fetched coach_persona, and a client-supplied persona value in
  // the request body has no effect on it whatsoever.
  it("composes the prompt from the server-fetched coach_persona, ignoring any persona value in the request body", async () => {
    const profileGateway = createFakeProfileGateway("bold");
    const { client: modelClient, calls: modelCalls } = createFakeModelClient();

    const deps = buildDeps({ profileGateway, modelClient });

    const response = await handleChatRequest(
      makeRequest({
        body: {
          message: "Help me rewrite this bullet point.",
          coach_persona: "steady",
        },
      }),
      deps
    );
    await readBodyToText(response);

    expect(profileGateway.getCoachPersona).toHaveBeenCalledWith(USER_ID);
    expect(modelCalls).toHaveLength(1);
    expect(modelCalls[0]?.systemPrompt).toContain("Coaching style: Bold");
    expect(modelCalls[0]?.systemPrompt).not.toContain("Coaching style: Steady");
  });

  // 2.4 — a null coach_persona (mid-onboarding or pre-migration) composes
  // the prompt with no tone-modifier block and no error.
  it("composes the prompt with no tone-modifier block when coach_persona is null", async () => {
    const profileGateway = createFakeProfileGateway(null);
    const { client: modelClient, calls: modelCalls } = createFakeModelClient();

    const deps = buildDeps({ profileGateway, modelClient });

    const response = await handleChatRequest(makeRequest(), deps);
    expect(response.status).toBe(200);
    await readBodyToText(response);

    expect(modelCalls[0]?.systemPrompt).not.toContain("Coaching style:");
  });
});
