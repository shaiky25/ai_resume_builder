## Purpose

Derives structured resume data from the ongoing conversation after each chat turn and persists it, so the live preview and future prompt context have real, user-specific data to work from instead of nothing.

## ADDED Requirements

### Requirement: Structured resume data derived after a successful turn
The system SHALL derive structured resume data from the conversation after each chat turn that completes successfully.

#### Scenario: Turn completes successfully
- **WHEN** a chat turn finishes streaming its response to the client without error
- **THEN** the system derives structured resume data reflecting the resume-relevant content of the conversation so far

### Requirement: Structured output persisted per user
The system SHALL persist derived structured resume data to the authenticated user's `resumes` record, scoped to that user.

#### Scenario: Extraction succeeds
- **WHEN** structured resume data is successfully derived for a user's turn
- **THEN** the user's `resumes.structured_output` is updated to reflect that data

#### Scenario: Data scoped to the owning user
- **WHEN** structured resume data is persisted
- **THEN** it is written only to the `resumes` row belonging to the user whose conversation produced it

### Requirement: Extraction failure does not fail the chat turn
A failure to derive or persist structured resume data SHALL NOT cause the chat turn itself to fail or withhold the assistant's response from the user.

#### Scenario: Extraction fails after a successful chat response
- **WHEN** the assistant's response has already been delivered to the user but structured-data derivation or persistence fails
- **THEN** the user still receives the completed chat response, and no partial or corrupt `structured_output` is written for that turn
