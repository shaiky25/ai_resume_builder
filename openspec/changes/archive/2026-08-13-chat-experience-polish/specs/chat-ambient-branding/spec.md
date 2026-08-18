## Purpose

Gives the chat surface an ambient sense of identity — motion and an illustrated empty state — instead of a flat, static background.

## ADDED Requirements

### Requirement: Chat surface has an ambient background treatment
The chat surface SHALL display a subtle animated or gradient background treatment, distinct from a flat single-color background.

#### Scenario: Ambient background is present behind the conversation
- **GIVEN** the chat surface is rendered
- **WHEN** a visitor views it, with or without messages present
- **THEN** a subtle animated or gradient background treatment is visible behind the conversation content

### Requirement: Empty conversation shows an illustrated empty state
The chat surface SHALL display an illustration or graphic alongside its empty-conversation messaging, rather than an empty message list with no visual content.

#### Scenario: Empty state includes an illustration
- **GIVEN** a conversation with no messages yet
- **WHEN** the chat pane renders
- **THEN** an illustration or graphic is shown as part of the empty-conversation state

### Requirement: Transition from empty to active conversation is animated
The chat surface SHALL animate the transition from its empty-conversation state to its active-conversation state when the first message is sent.

#### Scenario: First message triggers a transition
- **GIVEN** the chat surface is showing its empty-conversation state
- **WHEN** the first message is sent
- **THEN** the surface transitions to its active-conversation state with a visible animation rather than an abrupt swap
