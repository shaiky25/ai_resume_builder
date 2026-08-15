# resumes-schema Specification

## Purpose

Stores each user's raw parsed LinkedIn/resume text input alongside Claude's final structured resume output, scoped to that user.

## Requirements

### Requirement: resumes table schema
The system SHALL provide a `resumes` table with columns for `user_id` (references the Auth user), raw text input (parsed LinkedIn/resume content), and Claude's structured output, per user.

#### Scenario: Resume record created for a user
- **WHEN** a user's raw LinkedIn/resume text and/or Claude's structured output is persisted
- **THEN** the row is stored in `resumes` keyed to that user's `user_id`

### Requirement: Owner-scoped read/write RLS on resumes
Row Level Security SHALL restrict all client-side (anon key + user JWT) reads and writes on `resumes` to rows where `auth.uid() = user_id`.

#### Scenario: Owner reads their own resume data
- **GIVEN** an authenticated user with a valid JWT
- **WHEN** they query `resumes` for their own `user_id`
- **THEN** the row(s) are returned

#### Scenario: Owner writes their own resume data
- **GIVEN** an authenticated user with a valid JWT
- **WHEN** they insert or update a `resumes` row for their own `user_id`
- **THEN** the write succeeds

#### Scenario: User cannot read or write another user's resume data
- **GIVEN** an authenticated user with a valid JWT
- **WHEN** they attempt to read or write a `resumes` row for a `user_id` that is not their own
- **THEN** the operation is rejected by RLS
