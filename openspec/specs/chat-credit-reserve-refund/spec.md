# chat-credit-reserve-refund Specification

## Purpose
Prevents a burst of concurrent requests from racing past the credit check, while guaranteeing a reserved credit is never silently lost if the Claude call fails.
## Requirements
### Requirement: Reserve credit before opening the Claude stream
Once the credit gate passes, the system SHALL reserve/decrement the credit for the request **before** opening the Claude stream, not after.

#### Scenario: Credit is decremented prior to the Claude call
- **GIVEN** a request that has passed authentication and the credit gate
- **WHEN** the system proceeds to call Claude
- **THEN** the credit reservation/decrement is written and committed before the Claude stream is opened

#### Scenario: Concurrent requests cannot both pass on the same last credit
- **GIVEN** an authenticated user with exactly one credit remaining
- **WHEN** two requests from that user arrive concurrently and both pass the initial credit-gate read
- **THEN** the reserve-before-call step ensures only one of the two requests successfully reserves the credit; the other is treated as insufficient balance and does not proceed to call Claude

### Requirement: Refund on failure or dropped connection
If the Claude call errors, or the connection drops mid-stream after a credit was reserved, the system SHALL write a compensating entry to the ledger refunding that reservation. A reserved credit SHALL NOT be silently lost.

#### Scenario: Claude call errors after reservation
- **GIVEN** a credit was reserved for a request
- **WHEN** the subsequent Claude API call returns an error
- **THEN** a compensating refund entry is written to the ledger, restoring the user's balance

#### Scenario: Connection drops mid-stream after reservation
- **GIVEN** a credit was reserved and the Claude stream had begun
- **WHEN** the client connection drops before the stream completes
- **THEN** a compensating refund entry is written to the ledger reflecting the incomplete usage

