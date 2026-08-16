## ADDED Requirements

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
