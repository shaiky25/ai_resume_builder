## Purpose

Gives the premium-download paywall an actual server-side enforcement point, closing the gap where export was compiled entirely client-side with no way to check payment state that a user couldn't simply bypass.

## ADDED Requirements

### Requirement: Export compilation requires server-verified access
The system SHALL compile a user's PDF/DOCX export only after verifying, from server-side truth, that the authenticated user's `has_premium_download_access` is true. The client SHALL NOT be able to obtain a compiled export file by any path that skips this check.

#### Scenario: Authorized user receives their export
- **GIVEN** an authenticated user whose `has_premium_download_access` is true
- **WHEN** they request a PDF or DOCX export
- **THEN** the server compiles and returns the file

#### Scenario: Unauthorized user is refused
- **GIVEN** an authenticated user whose `has_premium_download_access` is false
- **WHEN** they request a PDF or DOCX export
- **THEN** the server refuses to compile or return a file, and responds with a distinguishable error rather than a partial or empty file

#### Scenario: Unauthenticated request is refused
- **GIVEN** a request to the export endpoint without a valid authenticated user
- **WHEN** the server processes the request
- **THEN** the request is refused and no file is compiled or returned

### Requirement: Access check reads server-side state, not client-supplied state
The system SHALL determine `has_premium_download_access` for the export authorization check by reading it from server-side storage for the authenticated user, and SHALL NOT accept a client-supplied value (e.g. a request-body field or header) as a substitute.

#### Scenario: Client-supplied access claim is ignored
- **GIVEN** a request to the export endpoint whose body or headers claim `has_premium_download_access: true` for a user whose actual server-side value is false
- **WHEN** the server processes the request
- **THEN** the request is refused, exactly as if no such claim had been supplied
