## MODIFIED Requirements

### Requirement: Server-side assembly of the composed prompt
The system SHALL assemble the hidden Impact-Writer Master Prompt server-side and append the authenticated user's LinkedIn/resume context, and, when the user has a target job set, the target job description and derived tailoring strategy. All of this context SHALL be pulled from Supabase rather than trusted from client input.

#### Scenario: Composed request uses server-fetched context, not client-supplied context
- **GIVEN** an authenticated, credit-reserved request to `POST /api/chat`
- **WHEN** the system assembles the request to send to Claude
- **THEN** the LinkedIn/resume context appended to the Master Prompt is fetched from Supabase for that user, and any resume/LinkedIn content included in the client's request body is not used as a substitute for it

#### Scenario: Composed request includes tailoring strategy when a target job is set
- **GIVEN** an authenticated user has a target job description and derived tailoring strategy stored in Supabase
- **WHEN** the system assembles the request to send to Claude
- **THEN** the target job description and tailoring strategy are appended to the Master Prompt alongside the resume/LinkedIn context

#### Scenario: Composed request omits tailoring strategy when no target job is set
- **GIVEN** an authenticated user has no target job set
- **WHEN** the system assembles the request to send to Claude
- **THEN** no target job description or tailoring strategy is appended to the Master Prompt
