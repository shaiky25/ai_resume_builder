# chat-rate-limiting Specification

## Purpose
Prevents burst abuse of the chat route from a single user, independent of and in addition to their credit balance.
## Requirements
### Requirement: Per-user rate limiting independent of credit balance
The system SHALL enforce a per-user rate limit on `POST /api/chat` requests that applies even when the user has sufficient credits.

#### Scenario: User within rate limit and with credits proceeds normally
- **GIVEN** an authenticated user under their rate limit with sufficient credits
- **WHEN** they send a request to `POST /api/chat`
- **THEN** the request proceeds through the credit gate and reservation as normal

#### Scenario: User exceeding rate limit is rejected despite having credits
- **GIVEN** an authenticated user who has exceeded their per-user rate limit
- **WHEN** they send a request to `POST /api/chat`, even with sufficient credit balance
- **THEN** the request is rejected due to rate limiting, no credit is reserved, and no Claude call is made

