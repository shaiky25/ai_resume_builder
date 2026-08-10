## Purpose

Establishes identity for the app via Supabase Auth so that every other table (profiles, user_credits, resumes) can key off a single, stable `user_id`.

## ADDED Requirements

### Requirement: Email/Password authentication
The system SHALL allow a user to create an account and sign in using an email address and password via Supabase Auth.

#### Scenario: New user signs up with email and password
- **GIVEN** no existing account for the given email
- **WHEN** a user submits a valid email and password to sign up
- **THEN** Supabase Auth creates a new user and returns a unique `user_id` for that account

#### Scenario: Returning user signs in with email and password
- **GIVEN** an existing account with matching email/password credentials
- **WHEN** the user submits those credentials to sign in
- **THEN** Supabase Auth authenticates the session and returns the same `user_id` as at signup

### Requirement: Google OAuth authentication
The system SHALL allow a user to create an account or sign in using Google OAuth via Supabase Auth.

#### Scenario: New user signs up with Google
- **GIVEN** no existing account linked to the given Google identity
- **WHEN** a user completes the Google OAuth flow
- **THEN** Supabase Auth creates a new user and returns a unique `user_id` for that account

#### Scenario: Returning user signs in with Google
- **GIVEN** an existing account previously linked via Google OAuth
- **WHEN** the user completes the Google OAuth flow again
- **THEN** Supabase Auth authenticates the session and returns the same `user_id` as at first signup

### Requirement: Stable user_id as the sole foreign key anchor
Every downstream table (`profiles`, `user_credits`, `resumes`) SHALL key off the `user_id` produced by Supabase Auth, regardless of which provider was used to authenticate.

#### Scenario: user_id is consistent across providers used by the same account
- **GIVEN** a user account exists
- **WHEN** that user authenticates via any enabled provider tied to that account
- **THEN** the same `user_id` is returned and used to scope all row-level security checks on `profiles`, `user_credits`, and `resumes`
