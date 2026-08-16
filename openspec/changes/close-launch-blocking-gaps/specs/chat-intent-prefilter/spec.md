## Purpose

Catches unambiguous off-topic or scope-override intent in the user's inbound message before it reaches Claude, so obvious attempts to repurpose the assistant cost no credit and no model call, without risking false positives on legitimate resume conversation.

## ADDED Requirements

### Requirement: Unambiguous scope-override or off-topic intent is short-circuited before any Claude call
The system SHALL scan the inbound `message` for deterministic, high-confidence signals of scope-override intent (e.g. explicit instruction-override phrasing such as "ignore your instructions"/"you are now...") or clearly off-topic requests with no plausible resume/career-coaching framing, and SHALL respond with a distinguishable redirect state without invoking the model or reserving a credit, when such a signal is matched.

#### Scenario: Explicit instruction-override phrasing is short-circuited
- **GIVEN** an authenticated user's message containing explicit instruction-override phrasing matched by the pre-filter
- **WHEN** the server processes the request
- **THEN** the server responds with a distinguishable redirect state, no credit is reserved, and no Claude call is made

#### Scenario: Legitimate resume-related message is unaffected
- **GIVEN** an authenticated user's message that is resume/career-coaching-related and matches no pre-filter signal
- **WHEN** the server processes the request
- **THEN** the request proceeds through the existing pipeline (rate limit, credit gate, Claude call) exactly as it does today

#### Scenario: Ambiguous message is not blocked
- **GIVEN** an authenticated user's message that does not unambiguously match a pre-filter signal, even if its topic is unclear
- **WHEN** the server processes the request
- **THEN** the request proceeds through the existing pipeline rather than being short-circuited

### Requirement: Pre-filter short-circuit does not consume a credit
A message short-circuited by the pre-filter SHALL NOT result in a credit reservation. The pre-filter runs after the existing rate-limit check (unchanged `chat-rate-limiting` ordering) but before the credit-gate read, so a short-circuited request still counts toward rate limiting like any other request, but never reaches the credit gate or the Claude call.

#### Scenario: Short-circuited message leaves credit balance unchanged
- **GIVEN** an authenticated user's message matched by the pre-filter
- **WHEN** the server responds with the redirect state
- **THEN** the user's credit balance is unchanged from before the request
