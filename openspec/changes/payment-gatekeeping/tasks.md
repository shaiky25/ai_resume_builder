## 1. Provider Configuration

- [ ] 1.1 Define `PAYMENT_PROVIDER` env var and per-provider credential/config structure
- [ ] 1.2 Build a config resolver that exposes active credentials, webhook endpoint, and verification method based on the configured provider

## 2. Checkout Session Creation

- [ ] 2.1 Build server-side endpoint to create a checkout session for the authenticated user
- [ ] 2.2 Embed `user_id` in session metadata (or provider equivalent) at creation time
- [ ] 2.3 Verify no provider credentials are exposed in the client-facing response

## 3. Post-Checkout UI State

- [ ] 3.1 Build the "processing" redirect landing state, decoupled from any assumption of success
- [ ] 3.2 Wire the processing state to resolve based on the subscribed/polled `has_premium_download_access` flag, not the redirect itself

## 4. Webhook Handling

- [ ] 4.1 Build webhook/notification endpoint using the configured provider's verification method
- [ ] 4.2 Reject unverified/invalid-signature requests before processing payload content
- [ ] 4.3 Implement payment-succeeded handling: idempotent grant via service-role write, deduped on (provider, transaction/session id)
- [ ] 4.4 Implement payment-failed handling: clear failure state, no access granted
- [ ] 4.5 Implement transaction logging (amount, provider transaction/session id, provider name, timestamp) with dedupe

## 5. Validation

- [ ] 5.1 Integration test: unverified/invalid-signature webhook is rejected with no grant and no log entry
- [ ] 5.2 Integration test: duplicate "succeeded" delivery for the same transaction id does not double-grant or double-log
- [ ] 5.3 Integration test: "failed" event grants no access and produces a clear failure state
- [ ] 5.4 Integration test: redirect alone (no verified webhook yet) never results in granted access
- [ ] 5.5 Integration test: switching `PAYMENT_PROVIDER` config requires no changes to checkout/webhook/grant logic
