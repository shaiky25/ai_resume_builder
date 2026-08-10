## Purpose

Tracks each user's remaining free message count and payment success status, and enforces the single most important boundary in the system: a client can never write to its own credit balance.

## ADDED Requirements

### Requirement: user_credits table schema
The system SHALL provide a `user_credits` table with columns for `user_id` (key, references the Auth user), remaining free message count, and payment success status.

#### Scenario: Credits row initialized for a new user
- **WHEN** a new user completes signup via any enabled Auth provider
- **THEN** a corresponding `user_credits` row exists keyed by that user's `user_id`, initialized with the default free message allotment

### Requirement: Owner read-only access via RLS
Row Level Security SHALL allow an authenticated client (anon key + user JWT) to SELECT only the `user_credits` row where `auth.uid() = user_id`, and SHALL NOT permit any client-side INSERT, UPDATE, or DELETE on this table under any policy.

#### Scenario: Owner reads their own credit balance
- **GIVEN** an authenticated user with a valid JWT
- **WHEN** they query `user_credits` for their own `user_id`
- **THEN** the row is returned

#### Scenario: Owner cannot update their own credit balance
- **GIVEN** an authenticated user with a valid JWT
- **WHEN** they attempt to UPDATE the `user_credits` row matching their own `user_id` (e.g. increasing the remaining message count)
- **THEN** the write is rejected because no client-side UPDATE policy exists on this table

#### Scenario: User cannot read another user's credit balance
- **GIVEN** an authenticated user with a valid JWT
- **WHEN** they query `user_credits` for a `user_id` that is not their own
- **THEN** no row is returned

### Requirement: Service-role is the sole writer
Only requests authenticated with the Supabase service-role key SHALL be permitted to INSERT, UPDATE, or DELETE rows in `user_credits`. This key is held exclusively by the Backend & Security layer's `/api/chat` route.

#### Scenario: Service-role client updates a credit balance
- **GIVEN** a request authenticated with the service-role key
- **WHEN** it updates the remaining message count on a `user_credits` row
- **THEN** the write succeeds, bypassing RLS as service-role connections do
