## Purpose

Grants the premium-download unlock exactly once per successful payment, even though payment providers commonly retry webhook deliveries.

## ADDED Requirements

### Requirement: Idempotent grant on payment-succeeded
On a verified "payment succeeded" event, the system SHALL use the Supabase service-role key to set `has_premium_download_access = true` for the `user_id` extracted from the checkout-session metadata (or equivalent), deduped on the provider transaction/session id so the same succeeded event received more than once does not double-grant.

#### Scenario: First delivery of a succeeded event grants access
- **GIVEN** a verified "payment succeeded" event not previously processed (new provider transaction/session id)
- **WHEN** the handler processes it
- **THEN** `has_premium_download_access` is set to true for the `user_id` embedded at checkout-session creation, and the transaction is logged

#### Scenario: Duplicate delivery of the same succeeded event does not double-grant
- **GIVEN** a verified "payment succeeded" event whose provider transaction/session id has already been processed successfully
- **WHEN** the handler receives the same event again (a provider retry)
- **THEN** access is not granted a second time and the transaction is not logged a second time, though the handler still returns success

### Requirement: user_id extracted only from checkout-time metadata
The system SHALL extract the `user_id` to grant access to from the metadata (or equivalent) attached at checkout-session creation, and SHALL NOT infer it from email or other loose matching.

#### Scenario: Grant targets the user_id embedded at session creation
- **GIVEN** a verified "payment succeeded" event for a session created with a specific `user_id` in its metadata
- **WHEN** the handler grants access
- **THEN** it grants access to exactly that `user_id`, not a user looked up by email or other payload fields
