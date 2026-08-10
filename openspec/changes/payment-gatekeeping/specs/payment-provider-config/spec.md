## Purpose

Keeps the concrete payment provider a deferred configuration decision, not something baked into checkout, webhook, or grant logic.

## ADDED Requirements

### Requirement: Single configuration point selects the active provider
The system SHALL determine the active payment provider, its credentials, its webhook endpoint, and its verification method from a single configuration point (e.g. a `PAYMENT_PROVIDER` environment variable plus associated per-provider config/credentials).

#### Scenario: Changing the configured provider requires no code changes elsewhere
- **GIVEN** the app's checkout-session creation, webhook verification, and grant-handling logic reference the provider only through the configuration point
- **WHEN** the configuration value is changed to a different supported provider
- **THEN** the active credentials, webhook endpoint, and verification method switch accordingly, with no provider-specific logic required in checkout, webhook, or grant-handling code paths

### Requirement: No provider-specific logic embedded elsewhere
Provider-specific SDK shapes, webhook event names, or session models SHALL NOT be assumed outside of what's common across major providers (hosted/embedded checkout, server-to-server notification, signed/verifiable payload) in any capability other than the provider configuration/adapter itself.

#### Scenario: Checkout and webhook capabilities remain provider-agnostic
- **GIVEN** the checkout-session-creation, webhook-signature-verification, and payment-succeeded/failed handling capabilities
- **WHEN** their behavior is reviewed
- **THEN** none of them reference a specific provider's SDK, event names, or session model beyond the common pattern (hosted/embedded checkout, server-to-server notification, signed/verifiable payload)
