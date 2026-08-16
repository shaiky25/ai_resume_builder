## MODIFIED Requirements

### Requirement: Suggested prompt chips appear before the first user message, in the selected persona's voice
The chat pane SHALL display a set of suggested prompts the visitor can select to start the conversation, before the visitor has sent any message, with chip copy varying according to the visitor's selected coaching persona.

#### Scenario: Chips are shown after the persona greeting, before a user message
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
