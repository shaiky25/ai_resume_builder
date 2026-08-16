# premium-download-gate Specification

## Purpose

Ensures resume export is only available once the user both has a ready resume and has paid for premium download access, based on live payment state rather than readiness alone.

## Requirements

### Requirement: Export requires both readiness and payment
The system SHALL enable PDF/DOCX export only when the resume is ready AND the authenticated user's `has_premium_download_access` flag is true.

#### Scenario: Ready but not paid
- **GIVEN** the resume is ready but the user's `has_premium_download_access` is false
- **WHEN** the export controls render
- **THEN** export is disabled

#### Scenario: Ready and paid
- **GIVEN** the resume is ready and the user's `has_premium_download_access` is true
- **WHEN** the export controls render
- **THEN** export is enabled

#### Scenario: Paid but not ready
- **GIVEN** the user's `has_premium_download_access` is true but the resume is not yet ready
- **WHEN** the export controls render
- **THEN** export is disabled

### Requirement: Access changes reflected without reload
The system SHALL reflect a change in `has_premium_download_access` in the export controls without requiring a page reload.

#### Scenario: Access granted while session is open
- **GIVEN** a user has the app open with export disabled due to lacking access
- **WHEN** their `has_premium_download_access` becomes true
- **THEN** the export controls become enabled without the user reloading the page
