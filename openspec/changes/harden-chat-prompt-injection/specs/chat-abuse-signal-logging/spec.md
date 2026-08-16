## Purpose

Makes jailbreak and off-topic-repurposing attempts observable after the fact, without blocking or altering the response delivered to the user.

## ADDED Requirements

### Requirement: Likely prompt-leak or scope-jailbreak attempts are logged, not blocked
The system SHALL check the assistant's completed response for signals that a prompt-leak or scope-jailbreak attempt likely succeeded or was attempted (e.g. the response containing a verbatim fragment of the Master Prompt, or an explicit statement that it is changing role or revealing its instructions), and SHALL record a flagged event including the request id and matched signal type when detected. This check SHALL NOT alter, delay, or block the response already delivered to the user.

#### Scenario: Response contains a Master Prompt fragment
- **GIVEN** a completed assistant response that contains a verbatim fragment of the Master Prompt text
- **WHEN** the system performs its post-response check
- **THEN** a flagged event is recorded referencing the request id, and the response already sent to the client is unaffected

#### Scenario: Response contains no leak/jailbreak signal
- **GIVEN** a completed assistant response containing no Master Prompt fragment and no explicit role-change or instruction-disclosure statement
- **WHEN** the system performs its post-response check
- **THEN** no flagged event is recorded

#### Scenario: Detection failure does not affect the chat turn
- **GIVEN** the post-response check itself fails (e.g. an internal error while checking)
- **WHEN** this occurs
- **THEN** the chat turn's response to the user is unaffected, and the failure is logged the same way an extraction failure is today
