## Purpose

Lets the frontend reflect credit balance changes the moment the backend decrements them, via Supabase Realtime, without routing that read through the backend layer.

## ADDED Requirements

### Requirement: Realtime subscription on user_credits
The system SHALL support a Supabase Realtime subscription on `user_credits` that delivers row-change events to the authenticated owner of that row, subject to the same RLS boundary as direct reads (owner-only, read-only).

#### Scenario: Client receives an update when the backend decrements a credit
- **GIVEN** an authenticated user subscribed to Realtime changes on their own `user_credits` row
- **WHEN** the Backend & Security layer's `/api/chat` route decrements that row using the service-role key
- **THEN** the subscribed client receives a change event reflecting the new balance without polling or an explicit refetch

#### Scenario: Client does not receive change events for another user's row
- **GIVEN** an authenticated user subscribed to Realtime changes scoped to their own `user_id`
- **WHEN** a different user's `user_credits` row changes
- **THEN** no change event is delivered to the first user's subscription
