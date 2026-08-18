## ADDED Requirements

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
