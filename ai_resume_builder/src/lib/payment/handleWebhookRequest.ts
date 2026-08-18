import { getConfiguredPaymentProvider } from "./providerRegistry";
import { SupabasePaymentTransactionsGateway, type PaymentTransactionsGateway } from "./transactionsGateway";
import type { PaymentProviderAdapter, VerifiedPaymentEvent } from "./types";

export interface HandleWebhookDependencies {
  getProvider: () => PaymentProviderAdapter;
  transactionsGateway: PaymentTransactionsGateway;
}

export function createDefaultDependencies(): HandleWebhookDependencies {
  return {
    getProvider: getConfiguredPaymentProvider,
    transactionsGateway: new SupabasePaymentTransactionsGateway(),
  };
}

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * POST /api/payments/webhook pipeline (4.1-4.5):
 *   1. Verify the notification's signature via the configured provider's
 *      mechanism BEFORE trusting any payload content — an invalid/missing
 *      signature is rejected outright, no grant, no log.
 *   2. Idempotently record the succeeded/failed outcome via
 *      record_payment_result (transactions gateway), which is also the
 *      dedupe gate and, on success, the access grant.
 *   3. Return 200 quickly regardless of whether this delivery was new or a
 *      provider retry of an already-processed event — providers retry
 *      slow/failed responses, so this must be safe to receive twice.
 */
export async function handleWebhookRequest(
  request: Request,
  deps: HandleWebhookDependencies = createDefaultDependencies()
): Promise<Response> {
  let provider: PaymentProviderAdapter;
  try {
    provider = deps.getProvider();
  } catch (err) {
    console.error("Failed to resolve configured payment provider", err);
    return jsonResponse(500, { error: "internal_error" });
  }

  const rawBody = await request.text();

  let event: VerifiedPaymentEvent | null;
  try {
    event = await provider.verifyAndParseEvent(rawBody, request.headers);
  } catch (err) {
    console.error("Payment webhook verification threw", err);
    event = null;
  }

  if (!event) {
    return jsonResponse(400, { error: "invalid_signature" });
  }

  try {
    await deps.transactionsGateway.recordResult({
      provider: provider.name,
      providerSessionId: event.providerSessionId,
      status: event.status,
      providerTransactionId: event.providerTransactionId,
      amountCents: event.amountCents,
    });
  } catch (err) {
    console.error("Failed to record payment result", err);
    return jsonResponse(500, { error: "internal_error" });
  }

  return jsonResponse(200, { received: true });
}
