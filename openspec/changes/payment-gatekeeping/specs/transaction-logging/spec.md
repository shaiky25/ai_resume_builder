## Purpose

Gives the app a reconciliation trail for payments regardless of which provider processed them.

## ADDED Requirements

### Requirement: Transaction log entry on processed payment events
The system SHALL log each processed payment event with amount, provider transaction/session id, provider name, and timestamp, for reconciliation.

#### Scenario: Successful payment is logged with reconciliation fields
- **GIVEN** a verified "payment succeeded" event processed for the first time
- **WHEN** the handler grants access
- **THEN** a transaction log entry is written including the amount, provider transaction/session id, provider name, and timestamp

#### Scenario: Duplicate event delivery does not create a duplicate log entry
- **GIVEN** a verified "payment succeeded" event whose provider transaction/session id was already logged
- **WHEN** the handler receives the same event again
- **THEN** no additional transaction log entry is created for that transaction/session id
