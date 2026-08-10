# chat-usage-logging Specification

## Purpose
Provides an accurate, post-hoc record of actual Claude usage and outcomes for reconciliation and analytics, independent of what was originally reserved.
## Requirements
### Requirement: Post-stream ledger and analytics logging
On stream completion, the system SHALL write an analytics event and a ledger entry reflecting actual usage for that request, regardless of whether the reserved credit amount matched the actual usage exactly.

#### Scenario: Successful stream logs actual usage
- **GIVEN** a Claude stream that completes successfully
- **WHEN** the stream finishes
- **THEN** an analytics event and a ledger entry are written reflecting the actual usage of that request

#### Scenario: Logging occurs even when reserved and actual usage differ
- **GIVEN** a completed stream whose actual usage differs from the originally reserved credit amount
- **WHEN** the post-stream logging step runs
- **THEN** the ledger entry reflects actual usage, not merely the original reservation amount

