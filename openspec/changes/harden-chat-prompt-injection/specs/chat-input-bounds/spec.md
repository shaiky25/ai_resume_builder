## Purpose

Rejects oversized chat input before it consumes a credit or reaches the model, closing off injection-by-volume and single-request cost-abuse vectors.

## ADDED Requirements

### Requirement: Message length is bounded
The system SHALL reject a `POST /api/chat` request whose `message` exceeds a fixed maximum length, before the credit-gate check, credit reservation, or any Claude call.

#### Scenario: Oversized message is rejected
- **GIVEN** an authenticated request whose `message` exceeds the configured maximum length
- **WHEN** the server processes the request
- **THEN** the request is rejected with a distinguishable 400 response, no credit is checked or reserved, and no Claude call is made

#### Scenario: Message within bounds is accepted
- **GIVEN** an authenticated request whose `message` is within the configured maximum length
- **WHEN** the server processes the request
- **THEN** the request proceeds to the existing rate-limit and credit-gate steps unaffected

### Requirement: History size is bounded
The system SHALL reject a `POST /api/chat` request whose `history` contains more than a fixed maximum number of entries, or whose individual entries exceed a fixed maximum length, before any Claude call is made.

#### Scenario: Oversized history is rejected
- **GIVEN** an authenticated request whose `history` exceeds the configured maximum entry count or per-entry length
- **WHEN** the server processes the request
- **THEN** the request is rejected with a distinguishable 400 response, no credit is checked or reserved, and no Claude call is made

#### Scenario: History within bounds is accepted
- **GIVEN** an authenticated request whose `history` is within the configured maximum entry count and per-entry length
- **WHEN** the server processes the request
- **THEN** the request proceeds to the existing rate-limit and credit-gate steps unaffected
