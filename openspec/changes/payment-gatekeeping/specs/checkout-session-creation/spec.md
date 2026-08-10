## Purpose

Starts the one-time premium-download unlock purchase without hardcoding a specific payment provider, keeping credentials server-side and tying the session back to the correct user.

## ADDED Requirements

### Requirement: Server-side-only session creation
The system SHALL create checkout sessions server-side only, using the configured payment provider's credentials stored in environment variables. Credentials SHALL NOT be exposed to the client, regardless of which provider is configured.

#### Scenario: Client never sees provider credentials
- **GIVEN** an authenticated user initiating the premium-download unlock purchase
- **WHEN** the client requests a checkout session
- **THEN** the server creates the session using environment-stored credentials, and no credential material appears in the response sent to the client

### Requirement: Session scoped to the authenticated user with user_id embedded
Checkout session creation SHALL be scoped to the authenticated user, and SHALL embed that user's `user_id` in session metadata (or the provider's equivalent mechanism) for later retrieval by the notification handler.

#### Scenario: Session metadata carries the initiating user's id
- **GIVEN** an authenticated user with a known `user_id`
- **WHEN** a checkout session is created for them
- **THEN** that `user_id` is embedded in the session's metadata (or equivalent), retrievable when the corresponding payment notification arrives later

#### Scenario: Unauthenticated request cannot create a session
- **GIVEN** a request to create a checkout session without a valid authenticated user
- **WHEN** the server processes the request
- **THEN** session creation is refused
