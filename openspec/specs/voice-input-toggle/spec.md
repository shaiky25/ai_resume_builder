# voice-input-toggle Specification

## Purpose
Establishes the voice-input toggle state and hook shape now, so a later change can drop in real recording/transcription without touching the chat send path.
## Requirements
### Requirement: isAudioInput toggle state
The system SHALL expose a toggleable `isAudioInput` state that controls whether voice input mode is active.

#### Scenario: Toggling switches input mode
- **GIVEN** `isAudioInput` is false (text input mode)
- **WHEN** the user toggles voice input on
- **THEN** `isAudioInput` becomes true and the UI reflects voice input mode being active

#### Scenario: Toggling off returns to text mode
- **GIVEN** `isAudioInput` is true (voice input mode)
- **WHEN** the user toggles voice input off
- **THEN** `isAudioInput` becomes false and the UI reflects text input mode being active

### Requirement: Stubbed transcription hook with a stable interface
The voice input hook SHALL expose a stable interface (e.g. start/stop recording, resulting transcribed text) that a later change can implement with a real provider (react-media-recorder → Whisper/AssemblyAI) without changing the chat send path that consumes its output.

#### Scenario: Stub hook produces no real transcription yet
- **GIVEN** `isAudioInput` is true and the stub hook is in place
- **WHEN** the user interacts with voice recording controls
- **THEN** the hook's interface responds (state changes as expected) without performing real audio capture or transcription, since the provider integration is out of scope for this proposal

#### Scenario: Downstream send path is unaffected by the stub
- **GIVEN** the stub hook eventually yields transcribed text through its stable interface
- **WHEN** that text is handed to the chat send path
- **THEN** the send path processes it identically to typed text, requiring no changes when the real transcription provider is later substituted in

