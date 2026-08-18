# chat-input-affordances Specification

## Purpose

Makes the chat input easier to start using and more responsive to what's typed or spoken, on top of the existing send-on-Enter/disabled-while-streaming input.
## Requirements
### Requirement: Suggested prompt chips appear before the first message
The chat pane SHALL display a set of suggested prompts the visitor can select to start the conversation, before the visitor has sent any message, with chip copy varying according to the visitor's selected coaching persona.

#### Scenario: Chips are shown in an empty conversation
- **GIVEN** a conversation containing only the static persona-voiced greeting and no user-sent message yet
- **WHEN** the chat pane renders
- **THEN** suggested prompt chips are displayed

#### Scenario: Chip copy matches the selected persona
- **GIVEN** a visitor with a selected coaching persona
- **WHEN** suggested prompt chips are displayed
- **THEN** their copy reflects that persona's voice, differing from the copy shown to a visitor with a different selected persona

#### Scenario: Selecting a chip sends it as a message
- **GIVEN** suggested prompt chips are displayed
- **WHEN** the visitor selects one
- **THEN** its text is sent as a message through the same send path as typed text

#### Scenario: Chips are not shown once the conversation has started
- **GIVEN** at least one message has been sent by the visitor
- **WHEN** the chat pane renders
- **THEN** suggested prompt chips are no longer displayed

### Requirement: Text input auto-resizes to its content
The chat input SHALL grow and shrink its height to fit multi-line input, up to a maximum height, rather than staying a fixed single-line height.

#### Scenario: Input grows with multi-line text
- **GIVEN** the visitor is typing into the chat input
- **WHEN** the typed text wraps to multiple lines
- **THEN** the input's height increases to show the additional lines, up to its maximum height

### Requirement: Keyboard shortcut hint is visible
The chat input SHALL display a visible hint describing how to send a message and how to insert a line break.

#### Scenario: Hint is visible near the input
- **GIVEN** the chat input is in text mode
- **WHEN** the chat pane renders
- **THEN** a hint describing the send and line-break keyboard shortcuts is visible near the input

### Requirement: Voice recording shows a distinct active state
The chat input SHALL show a visually distinct, animated state while voice recording is active, beyond the existing text label change.

#### Scenario: Recording shows an animated indicator
- **GIVEN** voice input mode is active
- **WHEN** recording starts
- **THEN** the input shows an animated recording indicator that stops when recording stops

