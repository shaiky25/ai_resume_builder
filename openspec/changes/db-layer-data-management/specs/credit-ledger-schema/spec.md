## Purpose

Records every credit reservation, decrement, and compensating refund so the Backend & Security layer's reserve-before-call / refund-on-failure pattern has an auditable, service-role-only-writable place to log each transaction.

## ADDED Requirements

### Requirement: credit_ledger table schema
The system SHALL provide a `credit_ledger` table with columns for `user_id` (references the Auth user), an amount/delta (positive for reservation/decrement, negative for refund, or an equivalent signed representation), a reason/type (e.g. reservation, refund), a reference to the related request, and a timestamp.

#### Scenario: Ledger row records a reservation
- **WHEN** the Backend & Security layer reserves a credit for a request
- **THEN** a corresponding `credit_ledger` row is written for that user reflecting the reservation

#### Scenario: Ledger row records a refund
- **WHEN** the Backend & Security layer issues a compensating refund for a failed or dropped request
- **THEN** a corresponding `credit_ledger` row is written for that user reflecting the refund, distinguishable from a reservation entry

### Requirement: Owner read-only access via RLS
Row Level Security SHALL allow an authenticated client (anon key + user JWT) to SELECT only `credit_ledger` rows where `auth.uid() = user_id`, and SHALL NOT permit any client-side INSERT, UPDATE, or DELETE on this table under any policy.

#### Scenario: Owner reads their own ledger history
- **GIVEN** an authenticated user with a valid JWT
- **WHEN** they query `credit_ledger` for their own `user_id`
- **THEN** their ledger rows are returned

#### Scenario: Owner cannot write to their own ledger
- **GIVEN** an authenticated user with a valid JWT
- **WHEN** they attempt to INSERT or UPDATE a `credit_ledger` row for their own `user_id`
- **THEN** the write is rejected because no client-side write policy exists on this table

#### Scenario: User cannot read another user's ledger rows
- **GIVEN** an authenticated user with a valid JWT
- **WHEN** they query `credit_ledger` for a `user_id` that is not their own
- **THEN** no rows are returned

### Requirement: Service-role is the sole writer
Only requests authenticated with the Supabase service-role key SHALL be permitted to INSERT, UPDATE, or DELETE rows in `credit_ledger`.

#### Scenario: Service-role client writes a ledger entry
- **GIVEN** a request authenticated with the service-role key
- **WHEN** it inserts a reservation or refund row into `credit_ledger`
- **THEN** the write succeeds, bypassing RLS as service-role connections do
