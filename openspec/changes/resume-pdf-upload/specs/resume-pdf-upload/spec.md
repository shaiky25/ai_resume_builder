## Purpose

Lets a user get an existing resume into the app by uploading a PDF instead of retyping or pasting its text, while bounding file size and extracted-text size so the parsed content never becomes an unbounded source of LLM token cost.

## ADDED Requirements

### Requirement: PDF upload affordance
The system SHALL provide a UI control letting an authenticated user upload a PDF file as an alternative to pasting resume/LinkedIn text.

#### Scenario: User selects a PDF to upload
- **GIVEN** an authenticated user viewing the chat interface
- **WHEN** they select a PDF file through the upload control
- **THEN** the file upload begins

### Requirement: Client-side file size limit
The system SHALL reject a selected file larger than the configured size limit before starting the upload, showing the user a clear error.

#### Scenario: Oversized file rejected before upload
- **GIVEN** a user selects a PDF file larger than the configured size limit
- **WHEN** the upload control processes the selection
- **THEN** the upload does not start and an error explaining the size limit is shown

#### Scenario: File within the limit proceeds
- **GIVEN** a user selects a PDF file at or under the configured size limit
- **WHEN** the upload control processes the selection
- **THEN** the upload proceeds

### Requirement: Server-side file size re-validation
The system SHALL re-validate the uploaded object's size against the same configured limit server-side before attempting to parse it, independent of any client-side check.

#### Scenario: Oversized object rejected server-side
- **GIVEN** an uploaded object in storage that exceeds the configured size limit (e.g. a client-side check was bypassed)
- **WHEN** the server processes it
- **THEN** parsing is not attempted and an error is returned instead of persisting any content

### Requirement: Owner-scoped upload storage
The system SHALL store the uploaded PDF in a private, owner-scoped location such that only the uploading user's own file is written or read.

#### Scenario: Upload is scoped to the authenticated user
- **GIVEN** an authenticated user uploading a PDF
- **WHEN** the file is stored
- **THEN** it is stored at a location scoped to that user's own identity, consistent with owner-scoped access rules

### Requirement: Text extraction without sending the PDF to the LLM
The system SHALL extract text from an uploaded PDF using deterministic, non-LLM processing; the raw PDF file or its binary/base64 encoding SHALL NOT be sent to the language model at any point in the upload flow.

#### Scenario: Extraction happens without a model call
- **GIVEN** an uploaded PDF within the size limit
- **WHEN** the system extracts its text
- **THEN** the extraction is performed by non-LLM processing and no request containing the PDF's binary content is sent to the language model

### Requirement: Extracted text length cap
The system SHALL cap the length of text persisted from a parsed PDF; text extracted beyond the cap SHALL be treated as an extraction failure rather than being silently truncated or partially persisted.

#### Scenario: Extracted text within the cap is persisted
- **GIVEN** a PDF whose extracted text is at or under the configured length cap
- **WHEN** extraction completes
- **THEN** the extracted text is persisted as the user's resume raw text

#### Scenario: Extracted text over the cap is rejected
- **GIVEN** a PDF whose extracted text exceeds the configured length cap
- **WHEN** extraction completes
- **THEN** no text is persisted and the user is shown an error instead of a truncated result

### Requirement: No-extractable-text handling
The system SHALL surface a clear error, without persisting any content, when a PDF yields no extractable text (for example, a scanned or image-only PDF with no text layer).

#### Scenario: Scanned PDF with no text layer
- **GIVEN** a PDF containing only images with no extractable text layer
- **WHEN** the system attempts extraction
- **THEN** no raw text is persisted and the user is shown an error directing them to paste their resume text manually

### Requirement: Successful extraction replaces prior raw text
The system SHALL persist successfully extracted PDF text as the authenticated user's resume raw text, replacing any previously stored value, scoped to that user only.

#### Scenario: New upload replaces previous raw text
- **GIVEN** a user who already has resume raw text stored (from a prior paste or upload)
- **WHEN** they successfully upload and extract a new PDF
- **THEN** the previous raw text is replaced with the newly extracted text for that user only

#### Scenario: Extraction failure leaves prior raw text unchanged
- **GIVEN** a user who already has resume raw text stored
- **WHEN** a new upload fails size validation, extraction, or the length cap
- **THEN** the previously stored raw text is left unchanged
