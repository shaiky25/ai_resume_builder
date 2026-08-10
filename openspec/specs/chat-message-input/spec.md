# chat-message-input Specification

## Purpose
Provides the primary conversational interface for the app — a message list and input that the user types or speaks into to work with the career-coach chat.
## Requirements
### Requirement: Message list renders conversation history
The chat pane SHALL render the sequence of user and assistant messages in order.

#### Scenario: New message appears in the list
- **GIVEN** an existing conversation displayed in the chat pane
- **WHEN** a new user or assistant message is added to the conversation
- **THEN** it appears in the message list in chronological order

### Requirement: Send on Enter
The chat input SHALL send the current input's text as a message when the user presses Enter.

#### Scenario: Enter key sends the message
- **GIVEN** the user has typed text into the chat input
- **WHEN** they press Enter
- **THEN** the text is sent as a new message and the input is cleared

### Requirement: Input disabled while a response streams
The chat input SHALL be disabled while an assistant response is actively streaming, and re-enabled once the response completes.

#### Scenario: Input is disabled during streaming
- **GIVEN** the user has sent a message and the assistant's response is streaming in
- **WHEN** the user attempts to type into or submit the chat input
- **THEN** the input is disabled and does not accept new submissions

#### Scenario: Input re-enables after streaming completes
- **GIVEN** an assistant response was streaming and has finished
- **WHEN** the stream completes
- **THEN** the chat input becomes enabled again

### Requirement: Single send path regardless of input source
The chat pane SHALL treat voice-transcribed text and typed text identically once captured, routing both through one send path with no branching logic downstream of input capture.

#### Scenario: Voice-transcribed text is sent the same way as typed text
- **GIVEN** text has been captured either by typing or by voice transcription
- **WHEN** that text is submitted as a message
- **THEN** it follows the same send path as any other message, with no distinct handling based on its origin

