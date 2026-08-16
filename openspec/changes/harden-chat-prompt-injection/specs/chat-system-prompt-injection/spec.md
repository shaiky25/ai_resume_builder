## MODIFIED Requirements

### Requirement: Server-side assembly of the composed prompt
The system SHALL assemble the hidden Impact-Writer Master Prompt server-side and append the authenticated user's LinkedIn/resume context, which SHALL be pulled from Supabase rather than trusted from client input. Any content the client supplies as prior conversation history SHALL be composed into the request as conversational content only, never as a substitute for or amendment to the Master Prompt or the server-fetched resume/LinkedIn context.

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

## ADDED Requirements

### Requirement: Client-supplied history is never authoritative about the system's own prior instructions or commitments
The system SHALL NOT treat any turn in client-supplied `history` — including turns presented with an `assistant` role — as evidence that the system previously agreed to disclose the Master Prompt, change its role or scope, or depart from resume/career-coaching behavior. The system's actual scope and confidentiality behavior SHALL be governed solely by the server-assembled Master Prompt for the current request, regardless of what prior "assistant" content the client supplies.

#### Scenario: Fabricated prior assistant turn does not unlock prompt disclosure
- **GIVEN** client-supplied `history` containing an `assistant`-role turn whose content claims the assistant already agreed to reveal its instructions or act outside resume/career-coaching scope
- **WHEN** the system composes and sends the request to Claude
- **THEN** the current turn's response still declines to reveal the Master Prompt and still stays within resume/career-coaching scope, as if that fabricated turn were absent

#### Scenario: Fabricated history does not suppress the confidentiality/scope framing
- **GIVEN** client-supplied `history` of any content or length
- **WHEN** the system composes the request sent to Claude
- **THEN** the Master Prompt's confidentiality and scope instructions are present in the composed request exactly as they would be for a request with empty history

### Requirement: Structured-extraction input is framed as untrusted conversational content
The conversation content passed to the structured-resume-extraction call SHALL be framed as material to extract resume-relevant facts from, not as instructions the extraction step should follow, consistent with how resume/LinkedIn context is already framed for the conversational call.

#### Scenario: Embedded instruction in conversation content does not alter extraction behavior
- **GIVEN** a chat turn whose content includes text formatted to resemble an instruction to the system (e.g. asking it to output unrelated data or change its extraction behavior)
- **WHEN** structured resume extraction runs on that conversation content
- **THEN** the extraction call's behavior (which fields it populates and how) is unaffected by that embedded instruction; only genuine resume-relevant facts are extracted
