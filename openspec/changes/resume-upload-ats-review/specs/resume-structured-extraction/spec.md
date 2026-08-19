## ADDED Requirements

### Requirement: Structured resume data derived after a successful PDF upload
The system SHALL derive structured resume data and persist it, merged with any previously persisted structured resume data (preserving fields not superseded by the newly uploaded text), immediately after a resume PDF upload's raw text is successfully extracted and persisted — in addition to, and independent of, the existing after-chat-turn trigger.

#### Scenario: Upload extraction succeeds
- **WHEN** raw text is successfully extracted and persisted from a user's uploaded resume PDF
- **THEN** the system derives structured resume data from that text, merged with any previously persisted structured resume data for that user, and updates the user's `resumes.structured_output` to reflect it

#### Scenario: No prior structured data exists
- **WHEN** a user with no previously persisted structured resume data successfully uploads and extracts a resume PDF
- **THEN** the system derives structured resume data from the uploaded text alone and persists it as that user's `resumes.structured_output`

### Requirement: Upload-triggered extraction failure does not fail the upload
A failure to derive or persist structured resume data after a successful PDF upload SHALL NOT cause the upload request itself to fail or discard the already-persisted raw text.

#### Scenario: Extraction fails after raw text is already persisted
- **WHEN** a resume PDF's raw text has already been successfully extracted and persisted, but deriving or persisting structured resume data from it then fails
- **THEN** the upload request still completes successfully, the persisted raw text is left unchanged, and no partial or corrupt `structured_output` is written for that user
