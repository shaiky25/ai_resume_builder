## Why

The app needs a one-time, low-cost unlock for premium downloads that isn't tied to a specific payment provider, so the provider decision (Stripe, PayPal, Paddle, Lemon Squeezy, etc.) can be made later without forcing a rewrite of the gatekeeping logic itself.

## What Changes

- Add provider-agnostic checkout session creation, server-side only, scoped to the authenticated user with `user_id` embedded in session metadata for later retrieval.
- Add a post-checkout "processing" UI state, decoupled from actual access grant — the redirect back from checkout never grants access by itself.
- Add notification/webhook signature verification, using whichever mechanism the configured provider requires, before trusting any payload content.
- Add payment-succeeded handling: idempotent grant of `has_premium_download_access` via the Supabase service-role key, deduped on provider transaction/session id so retried webhook deliveries never double-grant or double-log.
- Add payment-failed handling: a clear failure state, no access granted.
- Add transaction logging for reconciliation (amount, provider transaction/session id, provider name, timestamp).
- Add a single configuration point (e.g. `PAYMENT_PROVIDER` env var) that determines active provider, credentials, webhook endpoint, and verification method — no provider-specific logic embedded elsewhere in the app.

## Capabilities

### New Capabilities
- `checkout-session-creation`: Provider-agnostic checkout session creation, scoped to the authenticated user, with `user_id` embedded for later retrieval.
- `checkout-processing-state`: Post-checkout "processing" UI state, decoupled from actual access grant.
- `webhook-signature-verification`: Notification/webhook signature verification before processing any event.
- `payment-succeeded-handling`: Idempotent grant of `has_premium_download_access` via service-role write.
- `payment-failed-handling`: Clear failure state, no access granted.
- `transaction-logging`: Transaction logging for reconciliation, including which provider processed the transaction.
- `payment-provider-config`: Single configuration point determining active provider, credentials, and verification method.

### Modified Capabilities
(none — this is the first change establishing the payment layer)

## Impact

- **Affected code**: server-side checkout-session creation endpoint, a webhook/notification handler endpoint, and a provider-config module — no provider SDK, event name, or session-model assumptions beyond what's common across major providers (hosted/embedded checkout, server-to-server notification, signed/verifiable payload).
- **Dependencies/assumptions on other layers**: assumes a `has_premium_download_access` boolean column exists on `profiles` in the Data & Management layer, writable only via the service-role key (client can read it, cannot write it) — defined by `db-layer-data-management`. Assumes the frontend subscribes to this flag (Supabase Realtime or polling) to reveal the download button once true, rather than relying on the checkout redirect alone; the frontend's browser-side export (from `frontend-chat-ui`) is the consumer of this unlock flag.
- **Out of scope**: the choice of payment provider itself (deferred to a later decision), pricing/bundle strategy, download-compilation logic, the message-credit gating system (separate concern, separate table — see `backend-security-layer` / `db-layer-data-management`).
- **No breaking changes**: this is the initial payment layer.
