## Purpose

Prevents the untrustworthy client-side checkout redirect from being treated as proof of payment, while still giving the user clear feedback that their purchase is being confirmed.

## ADDED Requirements

### Requirement: Redirect shows a processing state, not an immediate unlock
When the user is redirected back to the app after checkout, the system SHALL show a "processing" state rather than immediately granting access.

#### Scenario: Redirect after checkout shows processing, not unlocked
- **GIVEN** a user completes the provider's checkout flow and is redirected back to the app
- **WHEN** the app renders the post-checkout page
- **THEN** it displays a "processing" state, and `has_premium_download_access` is not assumed true based on the redirect alone

### Requirement: Access grant depends only on verified server-side notification
The processing state SHALL resolve to "granted" only once the server-side payment notification has been verified and processed, never from the client-side redirect alone.

#### Scenario: Processing state resolves once server confirms payment
- **GIVEN** the user is in the "processing" state after redirect
- **WHEN** the server-side webhook/notification for that session is verified and processed as a success
- **THEN** the UI reflects the granted access (e.g. via the subscribed `has_premium_download_access` flag), independent of the redirect itself

#### Scenario: Processing state does not resolve to granted without server confirmation
- **GIVEN** the user is in the "processing" state after redirect
- **WHEN** no corresponding verified payment-succeeded notification has been processed yet
- **THEN** the UI continues to show "processing" rather than granting access
