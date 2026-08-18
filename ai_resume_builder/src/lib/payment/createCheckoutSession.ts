import { randomUUID } from "crypto";
import { verifyRequestUser, type AuthenticatedUser } from "@/lib/supabase/serverClient";
import { getConfiguredPaymentProvider } from "./providerRegistry";
import { SupabasePaymentTransactionsGateway, type PaymentTransactionsGateway } from "./transactionsGateway";
import type { PaymentProviderAdapter } from "./types";

export interface CreateCheckoutSessionDependencies {
  verifyUser: (authHeader: string | null) => Promise<AuthenticatedUser | null>;
  getProvider: () => PaymentProviderAdapter;
  transactionsGateway: PaymentTransactionsGateway;
  generateRequestId: () => string;
}

export function createDefaultDependencies(): CreateCheckoutSessionDependencies {
  return {
    verifyUser: verifyRequestUser,
    getProvider: getConfiguredPaymentProvider,
    transactionsGateway: new SupabasePaymentTransactionsGateway(),
    generateRequestId: () => randomUUID(),
  };
}

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * POST /api/payments/checkout pipeline: auth -> create a provider checkout
 * session scoped to the caller with user_id embedded -> persist the pending
 * transaction row -> return only the checkout URL (2.1-2.3). Never returns
 * provider credentials or session metadata beyond the redirect URL.
 */
export async function handleCreateCheckoutSessionRequest(
  request: Request,
  deps: CreateCheckoutSessionDependencies = createDefaultDependencies()
): Promise<Response> {
  const authHeader = request.headers.get("authorization");
  const user = await deps.verifyUser(authHeader);
  if (!user) {
    return jsonResponse(401, { error: "unauthenticated" });
  }

  const origin = new URL(request.url).origin;
  const requestId = deps.generateRequestId();

  let provider: PaymentProviderAdapter;
  try {
    provider = deps.getProvider();
  } catch (err) {
    console.error("Failed to resolve configured payment provider", err);
    return jsonResponse(500, { error: "internal_error" });
  }

  let session;
  try {
    session = await provider.createCheckoutSession({
      userId: user.id,
      successUrl: `${origin}/payment/processing?provider=${encodeURIComponent(provider.name)}`,
      cancelUrl: `${origin}/?payment=cancelled`,
    });
  } catch (err) {
    console.error("Failed to create checkout session", err, { requestId });
    return jsonResponse(502, { error: "checkout_provider_error" });
  }

  try {
    await deps.transactionsGateway.createPending({
      userId: user.id,
      provider: provider.name,
      providerSessionId: session.providerSessionId,
    });
  } catch (err) {
    console.error("Failed to persist pending checkout session", err, { requestId });
    return jsonResponse(500, { error: "internal_error" });
  }

  return jsonResponse(200, { checkoutUrl: session.checkoutUrl });
}
