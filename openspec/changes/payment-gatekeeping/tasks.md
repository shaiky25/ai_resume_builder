## 1. Provider Configuration

- [x] 1.1 Define `PAYMENT_PROVIDER` env var and per-provider credential/config structure
- [x] 1.2 Build a config resolver that exposes active credentials, webhook endpoint, and verification method based on the configured provider

## 2. Checkout Session Creation

- [x] 2.1 Build server-side endpoint to create a checkout session for the authenticated user
- [x] 2.2 Embed `user_id` in session metadata (or provider equivalent) at creation time
- [x] 2.3 Verify no provider credentials are exposed in the client-facing response

## 3. Post-Checkout UI State

- [x] 3.1 Build the "processing" redirect landing state, decoupled from any assumption of success
- [x] 3.2 Wire the processing state to resolve based on the subscribed/polled `has_premium_download_access` flag, not the redirect itself

## 4. Webhook Handling

- [x] 4.1 Build webhook/notification endpoint using the configured provider's verification method
- [x] 4.2 Reject unverified/invalid-signature requests before processing payload content
- [x] 4.3 Implement payment-succeeded handling: idempotent grant via service-role write, deduped on (provider, transaction/session id)
- [x] 4.4 Implement payment-failed handling: clear failure state, no access granted
- [x] 4.5 Implement transaction logging (amount, provider transaction/session id, provider name, timestamp) with dedupe

## 5. Validation

- [x] 5.1 Integration test: unverified/invalid-signature webhook is rejected with no grant and no log entry
- [x] 5.2 Integration test: duplicate "succeeded" delivery for the same transaction id does not double-grant or double-log
- [x] 5.3 Integration test: "failed" event grants no access and produces a clear failure state
- [x] 5.4 Integration test: redirect alone (no verified webhook yet) never results in granted access
- [x] 5.5 Integration test: switching `PAYMENT_PROVIDER` config requires no changes to checkout/webhook/grant logic
