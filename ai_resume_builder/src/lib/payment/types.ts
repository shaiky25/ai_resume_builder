/**
 * Provider-agnostic payment types. Nothing here may reference a specific
 * provider's SDK shape, webhook event names, or session model — only the
 * smallest surface common across major providers (hosted/embedded checkout,
 * server-to-server notification, signed/verifiable payload). See
 * openspec/changes/payment-gatekeeping/design.md.
 */

export interface CreateCheckoutSessionParams {
  /** The authenticated user this purchase is for; embedded in provider metadata. */
  userId: string;
  /**
   * Base URL to redirect to on successful checkout. The adapter is
   * responsible for appending whatever session-identifying query
   * param/placeholder syntax its provider requires (e.g. Stripe's literal
   * `{CHECKOUT_SESSION_ID}` template token) — kept out of this generic
   * interface so no provider-specific session model leaks into
   * checkout/webhook pipeline code.
   */
  successUrl: string;
  /** Where the provider should redirect if checkout is abandoned/cancelled. */
  cancelUrl: string;
}

export interface CreatedCheckoutSession {
  /** The URL the client should be sent to for hosted/embedded checkout. */
  checkoutUrl: string;
  /** The provider's session/transaction identifier for this checkout. */
  providerSessionId: string;
}

export type PaymentEventStatus = "succeeded" | "failed";

export interface VerifiedPaymentEvent {
  status: PaymentEventStatus;
  providerSessionId: string;
  /** Provider transaction id, if distinct from the session id; falls back to it otherwise. */
  providerTransactionId: string;
  /** Amount in the smallest currency unit (e.g. cents), if present on the event. */
  amountCents: number | null;
}

/**
 * The contract a concrete provider adapter (Stripe, PayPal, Paddle, Lemon
 * Squeezy, etc.) must implement. Writing a concrete adapter is explicitly
 * out of scope for this change (design.md Non-Goals) — this interface, and
 * the registry in providerRegistry.ts, are what keep checkout/webhook/grant
 * logic provider-swappable via configuration alone.
 */
export interface PaymentProviderAdapter {
  readonly name: string;

  createCheckoutSession(params: CreateCheckoutSessionParams): Promise<CreatedCheckoutSession>;

  /**
   * Verifies the authenticity of an incoming webhook/notification using
   * whatever mechanism this provider requires, and parses it into a
   * provider-agnostic event. Returns null if the signature is invalid,
   * missing, or unverifiable, or if the event type isn't a recognized
   * succeeded/failed outcome — callers must treat null as "reject, do not
   * process payload content."
   */
  verifyAndParseEvent(rawBody: string, headers: Headers): Promise<VerifiedPaymentEvent | null>;
}
