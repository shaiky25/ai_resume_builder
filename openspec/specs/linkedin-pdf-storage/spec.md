# linkedin-pdf-storage Specification

## Purpose

Provides a private Storage location for raw uploaded LinkedIn PDFs, kept for future reference or re-parsing, that is never publicly readable.

## Requirements

### Requirement: Private bucket for LinkedIn PDFs
The system SHALL provide a Storage bucket for LinkedIn PDF uploads that is marked private (not public) at all times.

#### Scenario: Bucket rejects anonymous public read
- **GIVEN** the LinkedIn PDF bucket
- **WHEN** an unauthenticated request attempts to read an object directly via a public URL
- **THEN** the request is denied

### Requirement: Owner-scoped, path-scoped upload policy
The bucket's policy SHALL permit INSERT only for the authenticated owner uploading to a path scoped by their own `user_id`.

#### Scenario: Owner uploads to their own path
- **GIVEN** an authenticated user with a valid JWT
- **WHEN** they upload a PDF to a storage path scoped to their own `user_id`
- **THEN** the upload succeeds

#### Scenario: User cannot upload to another user's path
- **GIVEN** an authenticated user with a valid JWT
- **WHEN** they attempt to upload a PDF to a storage path scoped to a different `user_id`
- **THEN** the upload is rejected by the bucket policy

### Requirement: Signed-URL-only read access
Read access to objects in the bucket SHALL be granted only via short-lived signed URLs generated server-side; no client-side SELECT policy SHALL grant direct read access.

#### Scenario: Server generates a signed URL for a user's own file
- **GIVEN** an authenticated user requesting access to their previously uploaded PDF
- **WHEN** the server generates a short-lived signed URL scoped to that object
- **THEN** the URL grants temporary read access to that object and expires after its configured lifetime

#### Scenario: Direct client read without a signed URL fails
- **GIVEN** an authenticated user with a valid JWT
- **WHEN** they attempt to read an object in the bucket without a signed URL
- **THEN** the read is denied
