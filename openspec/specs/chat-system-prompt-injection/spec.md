# chat-system-prompt-injection Specification

## Purpose
Keeps the Impact-Writer Master Prompt and the user's underlying resume/LinkedIn context entirely server-side, so the "how" of the career-coach rewriting behavior is never exposed to or tamperable by the client.
## Requirements
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

### Requirement: Persona tone-modifier is sourced server-side from the stored profile
The system SHALL append a persona-specific tone-modifier block to the composed Impact-Writer Master Prompt, selected server-side from the authenticated user's stored `profiles.coach_persona` value, and SHALL NOT accept a persona value from client-supplied request data.

#### Scenario: Tone modifier is selected from the stored profile value
- **GIVEN** an authenticated, credit-reserved request to `POST /api/chat`
- **WHEN** the system composes the prompt sent to Claude
- **THEN** the persona tone-modifier block appended matches the requesting user's `profiles.coach_persona` value fetched server-side, and any persona value included in the client's request body is ignored

#### Scenario: Tone modifier is selected from a fixed set, never interpolated as free text
- **GIVEN** the stored `coach_persona` value for a user
- **WHEN** the system selects a tone-modifier block
- **THEN** it selects among a fixed, predefined set of tone-modifier blocks based on that value rather than inserting the stored value directly into the prompt text

