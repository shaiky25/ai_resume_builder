# analytics-events-schema Specification

## Purpose

Records post-stream usage events so the Backend & Security layer has an authorized place to log actual per-request Claude usage after each completed stream, for analytics and reconciliation.

## Requirements

### Requirement: analytics_events table schema
The system SHALL provide an `analytics_events` table with columns for `user_id` (references the Auth user), a reference to the related request, event/usage details (e.g. token counts or an equivalent usage measure), and a timestamp.

#### Scenario: Event row recorded on stream completion
- **WHEN** the Backend & Security layer's `/api/chat` route finishes streaming a response
- **THEN** a corresponding `analytics_events` row is written reflecting that request's actual usage

### Requirement: Owner read-only access via RLS
Row Level Security SHALL allow an authenticated client (anon key + user JWT) to SELECT only `analytics_events` rows where `auth.uid() = user_id`, and SHALL NOT permit any client-side INSERT, UPDATE, or DELETE on this table under any policy.

#### Scenario: Owner reads their own analytics events
- **GIVEN** an authenticated user with a valid JWT
- **WHEN** they query `analytics_events` for their own `user_id`
- **THEN** their event rows are returned

#### Scenario: Owner cannot write their own analytics events
- **GIVEN** an authenticated user with a valid JWT
- **WHEN** they attempt to INSERT or UPDATE an `analytics_events` row for their own `user_id`
- **THEN** the write is rejected because no client-side write policy exists on this table

#### Scenario: User cannot read another user's analytics events
- **GIVEN** an authenticated user with a valid JWT
- **WHEN** they query `analytics_events` for a `user_id` that is not their own
- **THEN** no rows are returned

### Requirement: Service-role is the sole writer
Only requests authenticated with the Supabase service-role key SHALL be permitted to INSERT, UPDATE, or DELETE rows in `analytics_events`.

#### Scenario: Service-role client writes an analytics event
- **GIVEN** a request authenticated with the service-role key
- **WHEN** it inserts a usage row into `analytics_events` after a completed stream
- **THEN** the write succeeds, bypassing RLS as service-role connections do
