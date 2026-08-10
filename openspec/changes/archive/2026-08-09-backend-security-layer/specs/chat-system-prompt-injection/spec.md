## Purpose

Keeps the Impact-Writer Master Prompt and the user's underlying resume/LinkedIn context entirely server-side, so the "how" of the career-coach rewriting behavior is never exposed to or tamperable by the client.

## ADDED Requirements

### Requirement: Server-side assembly of the composed prompt
The system SHALL assemble the hidden Impact-Writer Master Prompt server-side and append the authenticated user's LinkedIn/resume context, which SHALL be pulled from Supabase rather than trusted from client input.

#### Scenario: Composed request uses server-fetched context, not client-supplied context
- **GIVEN** an authenticated, credit-reserved request to `POST /api/chat`
- **WHEN** the system assembles the request to send to Claude
- **THEN** the LinkedIn/resume context appended to the Master Prompt is fetched from Supabase for that user, and any resume/LinkedIn content included in the client's request body is not used as a substitute for it

### Requirement: Master prompt is never exposed to the client
The content of the Impact-Writer Master Prompt SHALL NOT appear in any client-visible request or response payload.

#### Scenario: Response payload excludes the master prompt
- **WHEN** the client receives the streamed response from `POST /api/chat`
- **THEN** the response contains only Claude's generated output, with no portion of the Master Prompt text present

#### Scenario: Request-echoing or debug payloads exclude the master prompt
- **GIVEN** any error or debug response returned to the client from this route
- **WHEN** that response is constructed
- **THEN** it does not include the Master Prompt content
