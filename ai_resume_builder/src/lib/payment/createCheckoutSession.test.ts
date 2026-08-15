import { describe, expect, it, vi } from "vitest";
import {
  handleCreateCheckoutSessionRequest,
  type CreateCheckoutSessionDependencies,
} from "./createCheckoutSession";
import type { PaymentTransactionsGateway } from "./transactionsGateway";
import type { CreatedCheckoutSession, PaymentProviderAdapter } from "./types";
import type { AuthenticatedUser } from "@/lib/supabase/serverClient";

const VALID_AUTH_HEADER = "Bearer valid-token";
const USER_ID = "user-1";

function createFakeVerifyUser(user: AuthenticatedUser | null) {
  return vi.fn(async (authHeader: string | null): Promise<AuthenticatedUser | null> => {
    if (authHeader !== VALID_AUTH_HEADER) return null;
    return user;
  });
}

function createFakeProvider(session: CreatedCheckoutSession) {
  const createCheckoutSession = vi.fn(async () => session);
  const adapter: PaymentProviderAdapter = {
    name: "fake-provider",
    createCheckoutSession,
    verifyAndParseEvent: vi.fn(),
  };
  return { adapter, createCheckoutSession };
}

function createFakeTransactionsGateway() {
  const pendingRows: Array<{ userId: string; provider: string; providerSessionId: string }> = [];
  const createPending = vi.fn(async (params: { userId: string; provider: string; providerSessionId: string }) => {
    pendingRows.push(params);
  });
  const gateway: PaymentTransactionsGateway = {
    createPending,
    recordResult: vi.fn(),
  };
  return { gateway, pendingRows };
}

function makeRequest(authHeader: string | null = VALID_AUTH_HEADER): Request {
  const headers = new Headers();
  if (authHeader !== null) headers.set("authorization", authHeader);
  return new Request("http://localhost/api/payments/checkout", { method: "POST", headers });
}

function buildDeps(overrides: Partial<CreateCheckoutSessionDependencies>): CreateCheckoutSessionDependencies {
  const { adapter } = createFakeProvider({ checkoutUrl: "https://provider.example/c/1", providerSessionId: "sess_1" });
  const { gateway } = createFakeTransactionsGateway();
  return {
    verifyUser: createFakeVerifyUser({ id: USER_ID }),
    getProvider: () => adapter,
    transactionsGateway: gateway,
    generateRequestId: () => "req-1",
    ...overrides,
  };
}

describe("handleCreateCheckoutSessionRequest", () => {
  // 2.3 (auth boundary) — an unauthenticated request never reaches the
  // provider or persists any transaction row.
  it("rejects an unauthenticated request before creating a session", async () => {
    const { adapter, createCheckoutSession } = createFakeProvider({
      checkoutUrl: "https://provider.example/c/1",
      providerSessionId: "sess_1",
    });
    const { gateway, pendingRows } = createFakeTransactionsGateway();

    const deps = buildDeps({ verifyUser: createFakeVerifyUser(null), getProvider: () => adapter, transactionsGateway: gateway });
    const response = await handleCreateCheckoutSessionRequest(makeRequest(null), deps);

    expect(response.status).toBe(401);
    expect(createCheckoutSession).not.toHaveBeenCalled();
    expect(pendingRows).toHaveLength(0);
  });

  // 2.2 — user_id is embedded in the session request for the authenticated caller.
  it("scopes checkout-session creation to the authenticated user and embeds their user_id", async () => {
    const { adapter, createCheckoutSession } = createFakeProvider({
      checkoutUrl: "https://provider.example/c/1",
      providerSessionId: "sess_1",
    });
    const { gateway, pendingRows } = createFakeTransactionsGateway();

    const deps = buildDeps({ getProvider: () => adapter, transactionsGateway: gateway });
    const response = await handleCreateCheckoutSessionRequest(makeRequest(), deps);

    expect(response.status).toBe(200);
    expect(createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({ userId: USER_ID })
    );
    expect(pendingRows).toEqual([
      { userId: USER_ID, provider: "fake-provider", providerSessionId: "sess_1" },
    ]);
  });

  // 2.3 — no credential material or provider-internal detail is ever
  // present in the client-facing response, only the checkout URL.
  it("returns only the checkout URL, no credential or provider-internal detail", async () => {
    const deps = buildDeps({});
    const response = await handleCreateCheckoutSessionRequest(makeRequest(), deps);
    const body = await response.json();

    expect(Object.keys(body)).toEqual(["checkoutUrl"]);
    expect(body.checkoutUrl).toBe("https://provider.example/c/1");
  });
});
