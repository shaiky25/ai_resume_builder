# chat-credit-gate Specification

## Purpose
Guarantees that a request from a user without sufficient credits never reaches Claude, so no cost is ever incurred on a request that was always going to be rejected.
## Requirements
### Requirement: Hard-stop credit check before any Claude call
After authentication succeeds, the system SHALL read the authenticated user's remaining credit balance. If the balance is insufficient, the system SHALL return `403 Forbidden` immediately, and SHALL NOT call the Claude API and SHALL NOT decrement or otherwise charge the user's balance.

#### Scenario: Sufficient credits allow the request to proceed
- **GIVEN** an authenticated user whose credit balance is above zero (or above the cost of the request)
- **WHEN** the route handler checks their balance
- **THEN** processing continues to the credit reserve step

#### Scenario: Insufficient credits short-circuit with 403 and no Claude call
- **GIVEN** an authenticated user whose credit balance is at or below their cap
- **WHEN** the route handler checks their balance
- **THEN** the response is `403 Forbidden`, no request is sent to the Claude API, and the user's balance is unchanged

### Requirement: Frontend-facing 403 semantics
The `403 Forbidden` response for insufficient credits SHALL be distinguishable from other error responses so the calling frontend can render an "upgrade/out-of-credits" state rather than a generic error.

#### Scenario: 403 response is distinguishable from a generic error
- **WHEN** the credit gate rejects a request for insufficient balance
- **THEN** the response status and body clearly indicate an out-of-credits condition rather than an unrelated server error

