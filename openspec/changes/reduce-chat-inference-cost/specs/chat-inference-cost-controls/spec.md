## Purpose

Bounds the per-message inference cost of the chat pipeline — independent of conversation length or which model tier the conversational reply needs — so cost scales with usage instead of growing unboundedly as sessions get longer.

## ADDED Requirements

### Requirement: Extraction model tier is independent of the conversational model tier
The system SHALL allow the model used for post-turn structured resume extraction to be configured independently of the model used for the conversational reply, so the two can run on different tiers.

#### Scenario: Extraction and conversational calls use different models
- **GIVEN** a completed chat turn that triggers both a conversational reply and post-stream structured extraction
- **WHEN** the system selects a model for each call
- **THEN** the extraction call's model is read from its own configuration, independent of and not required to equal the conversational call's model

### Requirement: Extraction call cost does not grow with conversation length
The system SHALL bound the input sent to the structured-extraction call so its size does not scale with the total number of turns in the conversation.

#### Scenario: Extraction payload size is stable across a long session
- **GIVEN** a conversation that has accumulated many prior turns
- **WHEN** the system performs structured extraction after the latest turn
- **THEN** the input sent to the extraction call is bounded to the latest turn plus the previously persisted structured output, not the full prior transcript

### Requirement: Static and session-stable system prompt content is cached across turns
The system SHALL mark the portions of the composed system prompt that do not change within a session (the master prompt and the current resume/LinkedIn context) as cacheable, so repeated turns within the same session do not re-bill that content as fresh input on every call.

#### Scenario: Repeated turn reuses cached prompt content
- **GIVEN** a session where the resume/LinkedIn context has not changed since the previous turn
- **WHEN** a subsequent chat turn composes the system prompt
- **THEN** the master prompt and resume/LinkedIn context portions are eligible for cache reuse rather than being billed as uncached input on every turn

#### Scenario: Cached content is invalidated when the underlying context changes
- **GIVEN** a session where structured extraction has just persisted updated resume context
- **WHEN** the next chat turn composes the system prompt
- **THEN** the system does not serve stale cached resume context — the cache reflects the updated context
