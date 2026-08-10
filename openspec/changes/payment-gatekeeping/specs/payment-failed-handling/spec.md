## Purpose

Ensures a failed payment leaves the user in an unambiguous, ungated state rather than a false "processing" limbo or an accidental grant.

## ADDED Requirements

### Requirement: Failed payment grants no access
On a verified "payment failed" event, the system SHALL NOT grant `has_premium_download_access`, and SHALL surface a clear failure state.

#### Scenario: Verified failure event results in no access grant
- **GIVEN** a verified "payment failed" event for a given checkout session
- **WHEN** the handler processes it
- **THEN** `has_premium_download_access` remains unchanged (not granted) for the associated `user_id`

#### Scenario: Clear failure state is observable
- **GIVEN** a verified "payment failed" event has been processed
- **WHEN** the user's client subsequently checks their access/processing state
- **THEN** it reflects a clear failure, distinct from the "processing" state, rather than leaving the user waiting indefinitely
