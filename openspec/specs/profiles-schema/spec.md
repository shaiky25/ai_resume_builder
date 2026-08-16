# profiles-schema Specification

## Purpose

Stores basic per-user profile information (email, display name, plan tier) that the frontend reads directly and that other layers reference by `user_id`.
## Requirements
### Requirement: profiles table schema
The system SHALL provide a `profiles` table with columns for `user_id` (key, references the Auth user), `email`, `display_name`, `plan_tier`, and `created_at`.

#### Scenario: Profile row created for a new user
- **WHEN** a new user completes signup via any enabled Auth provider
- **THEN** a corresponding `profiles` row exists keyed by that user's `user_id`

### Requirement: Owner-scoped read/write RLS on profiles
Row Level Security SHALL restrict all client-side (anon key + user JWT) reads and writes on `profiles` to rows where `auth.uid() = user_id`.

#### Scenario: Owner reads their own profile
- **GIVEN** an authenticated user with a valid JWT
- **WHEN** they query `profiles` for their own `user_id`
- **THEN** the row is returned

#### Scenario: Owner updates their own profile
- **GIVEN** an authenticated user with a valid JWT
- **WHEN** they update `display_name` on the `profiles` row matching their own `user_id`
- **THEN** the update succeeds

#### Scenario: User cannot read another user's profile
- **GIVEN** an authenticated user with a valid JWT
- **WHEN** they query `profiles` for a `user_id` that is not their own
- **THEN** no row is returned

#### Scenario: User cannot write another user's profile
- **GIVEN** an authenticated user with a valid JWT
- **WHEN** they attempt to update a `profiles` row for a `user_id` that is not their own
- **THEN** the write is rejected by RLS

### Requirement: has_premium_download_access is client-readable but not client-writable
The `profiles` table SHALL include a `has_premium_download_access` boolean column, defaulting to `false`. This column SHALL be readable by its owner under the same owner-scoped RLS as the rest of the row, but SHALL NOT be writable by any client-side (anon key + user JWT) request, even though the owner can otherwise write their own `profiles` row. Only the service-role key SHALL be permitted to write this column.

#### Scenario: Owner reads their own has_premium_download_access value
- **GIVEN** an authenticated user with a valid JWT
- **WHEN** they query `profiles` for their own `user_id`
- **THEN** the returned row includes the current value of `has_premium_download_access`

#### Scenario: Owner cannot set their own has_premium_download_access to true
- **GIVEN** an authenticated user with a valid JWT
- **WHEN** they attempt to update `has_premium_download_access` on their own `profiles` row (e.g. alongside a legitimate `display_name` update)
- **THEN** that column's value is not changed by the client-originated write, even if other columns in the same request succeed

#### Scenario: Service-role client sets has_premium_download_access
- **GIVEN** a request authenticated with the service-role key
- **WHEN** it updates `has_premium_download_access` to `true` for a given `user_id`
- **THEN** the write succeeds

### Requirement: coach_persona is a constrained, client-writable column
The `profiles` table SHALL include a `coach_persona` column restricted at the database layer to one of exactly three values — `momentum`, `steady`, `bold` — or null. This column SHALL be both readable and writable by its owner under the same owner-scoped RLS as the rest of the row.

#### Scenario: Owner sets their own coach_persona to a valid value
- **GIVEN** an authenticated user with a valid JWT
- **WHEN** they update `coach_persona` on their own `profiles` row to `momentum`, `steady`, or `bold`
- **THEN** the update succeeds

#### Scenario: Database rejects an out-of-set value
- **GIVEN** a write attempt against the `coach_persona` column, from any client including the service-role key
- **WHEN** the value being written is not one of `momentum`, `steady`, `bold`, or null
- **THEN** the database rejects the write with a constraint violation

#### Scenario: Owner reads their own coach_persona value
- **GIVEN** an authenticated user with a valid JWT
- **WHEN** they query `profiles` for their own `user_id`
- **THEN** the returned row includes the current value of `coach_persona`

#### Scenario: User cannot write another user's coach_persona
- **GIVEN** an authenticated user with a valid JWT
- **WHEN** they attempt to update `coach_persona` on a `profiles` row that is not their own
- **THEN** the write is rejected by RLS

