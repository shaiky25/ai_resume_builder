## MODIFIED Requirements

### Requirement: Export requires both readiness and payment
The system SHALL enable PDF/DOCX export only when the authenticated user's `has_premium_download_access` flag is true, AND either:
- (a) the resume is ready, and, if the user has a target job set, the system has determined the user is satisfied with the optimized resume; OR
- (b) the user explicitly asks to export the resume as currently built, regardless of readiness.

#### Scenario: Ready but not paid
- **GIVEN** the resume is ready but the user's `has_premium_download_access` is false
- **WHEN** the export controls render
- **THEN** export is disabled

#### Scenario: Ready and paid
- **GIVEN** the resume is ready, the user's `has_premium_download_access` is true, and the user has no target job set
- **WHEN** the export controls render
- **THEN** export is enabled

#### Scenario: Paid but not ready
- **GIVEN** the user's `has_premium_download_access` is true, the resume is not yet ready, and the user has not explicitly asked to export it as currently built
- **WHEN** the export controls render
- **THEN** export is disabled

#### Scenario: Paid but not ready, user explicitly requests the current progress
- **GIVEN** the user's `has_premium_download_access` is true and the resume is not yet ready
- **WHEN** the user explicitly asks to export or download the resume as currently built
- **THEN** export is enabled for the resume's current, possibly incomplete, content

#### Scenario: Ready, paid, target job set, satisfaction not yet determined
- **GIVEN** the resume is ready, the user's `has_premium_download_access` is true, and the user has a target job set but the system has not determined they are satisfied with the optimized resume
- **WHEN** the export controls render
- **THEN** export is disabled

#### Scenario: Ready, paid, target job set, satisfaction determined
- **GIVEN** the resume is ready, the user's `has_premium_download_access` is true, the user has a target job set, and the system has determined the user is satisfied with the optimized resume
- **WHEN** the export controls render
- **THEN** export is enabled
