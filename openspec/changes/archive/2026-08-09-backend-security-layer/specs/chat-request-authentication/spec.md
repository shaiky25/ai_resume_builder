## Purpose

Ensures every request to `POST /api/chat` is tied to a verified, authenticated Supabase user before any credit, prompt, or Claude logic runs.

## ADDED Requirements

### Requirement: JWT verification precedes all other logic
The system SHALL verify the caller's Supabase JWT using a server-side Supabase client before evaluating credits, assembling prompts, or calling Claude. The system SHALL NOT trust a client-passed user ID as a substitute for JWT verification.

#### Scenario: Valid JWT allows the request to proceed
- **GIVEN** a request to `POST /api/chat` carrying a valid Supabase session JWT
- **WHEN** the route handler verifies the JWT server-side
- **THEN** the request proceeds to the credit-check gate using the verified user identity

#### Scenario: Missing or invalid JWT is rejected before any other logic
- **GIVEN** a request to `POST /api/chat` with a missing, expired, or invalid JWT
- **WHEN** the route handler attempts server-side verification
- **THEN** the request is rejected with an unauthenticated error response, and no credit check, prompt assembly, or Claude call occurs

#### Scenario: Client-supplied user ID is ignored
- **GIVEN** a request to `POST /api/chat` whose body or headers include a client-supplied user ID that differs from the JWT's subject
- **WHEN** the route handler processes the request
- **THEN** the verified JWT's user identity is used for all downstream logic, not the client-supplied value
