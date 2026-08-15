# chat-message-presentation Specification

## Purpose

Gives the message list a polished, agent-like presentation — who said what and when, lightweight formatting, and visible feedback while the assistant is composing — on top of the existing plain-text message list.

## Requirements

### Requirement: Messages show a role-distinguishing avatar
The message list SHALL render a visual indicator distinguishing the assistant's messages from the user's messages, in addition to existing alignment/color cues.

#### Scenario: Assistant and user messages are visually distinguishable
- **GIVEN** a conversation containing both user and assistant messages
- **WHEN** the message list renders
- **THEN** each message shows an avatar/indicator corresponding to its role

### Requirement: Messages show a timestamp
The message list SHALL display the time each message was sent.

#### Scenario: New message shows its send time
- **GIVEN** a user or assistant message is added to the conversation
- **WHEN** it appears in the message list
- **THEN** it displays the time it was sent

### Requirement: New messages animate into view
The message list SHALL animate the appearance of a newly added message rather than having it appear instantly.

#### Scenario: A new message enters with a transition
- **GIVEN** the message list is displaying an existing conversation
- **WHEN** a new message is appended
- **THEN** it animates into place rather than appearing abruptly

### Requirement: Message text renders basic inline formatting
The message list SHALL render a limited safe subset of markdown-style formatting in message text — bold, italic, inline code, and line breaks — rather than only plain text.

#### Scenario: Formatted text renders as styled output
- **GIVEN** a message's text contains bold, italic, inline-code, or line-break markup
- **WHEN** the message renders
- **THEN** the corresponding styled output is shown instead of the raw markup characters

#### Scenario: Unsupported markup renders as plain text
- **GIVEN** a message's text contains markup outside the supported subset
- **WHEN** the message renders
- **THEN** the unsupported markup is shown as plain text rather than causing an error or being silently dropped

### Requirement: Assistant composing state shows a thinking indicator
The message list SHALL show a distinct "thinking" indicator in place of a message while the assistant's response is streaming and no content has yet arrived.

#### Scenario: Thinking indicator appears while awaiting the first chunk
- **GIVEN** the user has sent a message and the assistant's response is streaming
- **WHEN** no assistant content has arrived yet
- **THEN** a thinking indicator is shown in the message list

#### Scenario: Thinking indicator is replaced once content arrives
- **GIVEN** a thinking indicator is shown while awaiting the assistant's response
- **WHEN** the assistant's message content becomes available
- **THEN** the thinking indicator is replaced by the assistant's message
