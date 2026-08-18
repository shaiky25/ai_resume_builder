# coach-persona-onboarding Specification

## Purpose
Gives first-time users an instant, personalized payoff by having them choose a coaching style — Momentum, Steady, or Bold — before their first chat, and having the coach visibly honor that choice from the very first message.
## Requirements
### Requirement: Persona picker gates the chat surface on first use
The system SHALL show a blocking persona-selection screen before the chat surface renders for any authenticated user with no persona stored, offering exactly three coaching styles — Momentum, Steady, Bold — each accompanied by a sample coach line demonstrating that style's tone.

#### Scenario: New user without a stored persona sees the picker
- **GIVEN** an authenticated user whose profile has no `coach_persona` value
- **WHEN** they open the chat experience
- **THEN** a persona-selection screen is shown before the chat surface renders, offering the Momentum, Steady, and Bold styles, each with a sample coach line

#### Scenario: User with a stored persona does not see the picker
- **GIVEN** an authenticated user whose profile has a `coach_persona` value already set
- **WHEN** they open the chat experience
- **THEN** the chat surface renders directly, without the persona-selection screen

### Requirement: Persona choice is persisted
The system SHALL persist the user's selected persona to their profile so the choice survives across sessions.

#### Scenario: Selecting a persona persists it
- **GIVEN** the persona-selection screen is shown
- **WHEN** the user selects one of the three styles
- **THEN** that choice is saved to the user's profile and is still in effect the next time they open the chat experience, including from a different device or browser session

### Requirement: Static persona-voiced greeting on selection
The system SHALL display a pre-written, persona-voiced greeting as the first chat message immediately after a persona is selected, without invoking the coach model or consuming a chat credit.

#### Scenario: Greeting appears instantly after selection
- **GIVEN** the user has just selected a persona on the picker screen
- **WHEN** the chat surface renders
- **THEN** a persona-voiced greeting message for the selected style appears as the first message in the conversation, with no chat credit consumed and no delay waiting on a model response

### Requirement: Coaching style can be changed after onboarding
The chat header SHALL provide an affordance to change the selected coaching style at any time after initial selection.

#### Scenario: Changing style updates the stored persona
- **GIVEN** a user with a previously selected persona
- **WHEN** they use the "change coaching style" affordance in the chat header and select a different style
- **THEN** their stored persona is updated to the new selection

### Requirement: Persona read reflects the latest stored value after reconnect
The system SHALL refresh its view of the stored persona when the browser tab regains visibility or when its realtime subscription reconnects after a drop, rather than continuing to display a possibly-stale in-memory value indefinitely.

#### Scenario: Realtime subscription drop is followed by a refetch
- **GIVEN** the client's realtime subscription to the profile row is active
- **WHEN** the subscription drops and then either the browser tab regains visibility or the subscription reconnects
- **THEN** the client refetches the stored persona value rather than continuing to rely on the in-memory value from before the drop

