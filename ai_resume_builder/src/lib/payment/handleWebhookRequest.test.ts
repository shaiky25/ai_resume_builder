import { describe, expect, it, vi } from "vitest";
import { handleWebhookRequest, type HandleWebhookDependencies } from "./handleWebhookRequest";
import type { PaymentTransactionsGateway, RecordResultResult } from "./transactionsGateway";
import type { PaymentEventStatus, PaymentProviderAdapter, VerifiedPaymentEvent } from "./types";

const USER_ID = "user-1";

function createFakeProvider(verifyResult: VerifiedPaymentEvent | null) {
  const verifyAndParseEvent = vi.fn(async () => verifyResult);
  const adapter: PaymentProviderAdapter = {
    name: "fake-provider",
    createCheckoutSession: vi.fn(),
    verifyAndParseEvent,
  };
  return { adapter, verifyAndParseEvent };
}

/**
 * In-memory fake modeling the record_payment_result RPC: a session can only
 * leave 'pending' once, mirroring the migration's `WHERE status = 'pending'`
 * guard — this is what makes it an honest model of the dedupe/idempotency
 * behavior under test, not just a stub.
 */
function createFakeTransactionsGateway(seed: Record<string, PaymentEventStatus | "pending">) {
  const sessions = new Map(Object.entries(seed));
  const calls: Array<{ status: PaymentEventStatus; providerSessionId: string }> = [];
  const grants: string[] = [];

  const recordResult = vi.fn(
    async (params: {
      provider: string;
      providerSessionId: string;
      status: PaymentEventStatus;
      providerTransactionId: string;
      amountCents: number | null;
    }): Promise<RecordResultResult> => {
      calls.push({ status: params.status, providerSessionId: params.providerSessionId });
      const current = sessions.get(params.providerSessionId) ?? "pending";
      if (current !== "pending") {
        return { processed: false, userId: null };
      }
      sessions.set(params.providerSessionId, params.status);
      if (params.status === "succeeded") grants.push(params.providerSessionId);
      return { processed: true, userId: USER_ID };
    }
  );

  const gateway: PaymentTransactionsGateway = { createPending: vi.fn(), recordResult };
  return { gateway, calls, grants };
}

function makeRequest(body = "{}"): Request {
  return new Request("http://localhost/api/payments/webhook", { method: "POST", body });
}

describe("handleWebhookRequest", () => {
  // 5.1 — an unverified/invalid-signature webhook is rejected before any
  // payload content is trusted: no dedupe/grant call, no log entry.
  it("rejects a webhook with an invalid signature before processing any event", async () => {
    const { adapter, verifyAndParseEvent } = createFakeProvider(null);
    const { gateway, calls } = createFakeTransactionsGateway({});

    const deps: HandleWebhookDependencies = { getProvider: () => adapter, transactionsGateway: gateway };
    const response = await handleWebhookRequest(makeRequest(), deps);

    expect(response.status).toBe(400);
    expect(verifyAndParseEvent).toHaveBeenCalled();
    expect(calls).toHaveLength(0);
  });

  // 5.2 — a duplicate delivery of the same succeeded event does not
  // double-grant or double-log, though the handler still returns success.
  it("does not double-grant on a duplicate succeeded delivery for the same session id", async () => {
    const event: VerifiedPaymentEvent = {
      status: "succeeded",
      providerSessionId: "sess_1",
      providerTransactionId: "txn_1",
      amountCents: 199,
    };
    const { adapter } = createFakeProvider(event);
    const { gateway, calls, grants } = createFakeTransactionsGateway({});

    const deps: HandleWebhookDependencies = { getProvider: () => adapter, transactionsGateway: gateway };

    const first = await handleWebhookRequest(makeRequest(), deps);
    const second = await handleWebhookRequest(makeRequest(), deps);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200); // still returns success on the retry
    expect(calls).toHaveLength(2); // both deliveries reach the gateway...
    expect(grants).toEqual(["sess_1"]); // ...but only the first ever granted
  });

  // 5.3 — a verified "failed" event grants no access and is distinguishable
  // from a successful grant.
  it("grants no access on a verified payment-failed event", async () => {
    const event: VerifiedPaymentEvent = {
      status: "failed",
      providerSessionId: "sess_2",
      providerTransactionId: "txn_2",
      amountCents: null,
    };
    const { adapter } = createFakeProvider(event);
    const { gateway, grants } = createFakeTransactionsGateway({});

    const deps: HandleWebhookDependencies = { getProvider: () => adapter, transactionsGateway: gateway };
    const response = await handleWebhookRequest(makeRequest(), deps);

    expect(response.status).toBe(200);
    expect(grants).toHaveLength(0);
  });
});
