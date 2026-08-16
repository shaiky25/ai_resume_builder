## Purpose

Lets the user provide and persist a target job (title, company, and full job description text) that anchors the current resume session, giving downstream tailoring logic a concrete job to optimize against.

## ADDED Requirements

### Requirement: User can set a target job for the session
The system SHALL allow an authenticated user to submit a target job consisting of a job title, an optional company name, and the full job description text.

#### Scenario: User submits a target job description
- **GIVEN** an authenticated user working on their resume
- **WHEN** they submit a job title and job description text as their target job
- **THEN** the target job is accepted and associated with their resume session

### Requirement: Target job persisted per user
The system SHALL persist the target job (title, company, description text) scoped to the authenticated user's `user_id`, and SHALL replace the previously stored target job when the user submits a new one.

#### Scenario: Target job saved
- **WHEN** a user submits a target job
- **THEN** the target job is stored, scoped to that user's `user_id`

#### Scenario: Target job updated replaces the previous value
- **GIVEN** a user already has a target job stored
- **WHEN** they submit a new target job
- **THEN** the previously stored target job is replaced by the new one for that user

### Requirement: Owner-scoped read/write access to target job data
Row Level Security SHALL restrict all client-side (anon key + user JWT) reads and writes on the target job data to rows where `auth.uid() = user_id`.

#### Scenario: Owner reads their own target job
- **GIVEN** an authenticated user with a valid JWT
- **WHEN** they query their own target job data
- **THEN** the data is returned

#### Scenario: User cannot read or write another user's target job
- **GIVEN** an authenticated user with a valid JWT
- **WHEN** they attempt to read or write target job data for a `user_id` that is not their own
- **THEN** the operation is rejected by RLS
