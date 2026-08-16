# chat-live-integration Specification

## Purpose

Connects the production chat UI to the real `/api/chat` backend so users have an actual conversation with Claude and see the backend's real success/error states, replacing the client-side mock that currently stands in for it.

## Requirements

### Requirement: Chat UI sends real messages to the backend
The chat UI SHALL send each user message to `/api/chat` with the authenticated user's credentials and prior turn history, rather than generating a locally-mocked reply.

#### Scenario: User sends a message
- **WHEN** an authenticated user submits a chat message
- **THEN** the client sends a request to `/api/chat` carrying the user's message, prior turn history, and the user's auth credentials

### Requirement: Chat UI renders the streamed response incrementally
The chat UI SHALL render assistant text as it arrives from the backend's SSE stream, rather than waiting for a full response or a fixed delay.

#### Scenario: Assistant text streams in
- **WHEN** the backend emits streamed text chunks for the in-progress response
- **THEN** the chat UI appends each chunk to the assistant's message as it is received

#### Scenario: Stream completes
- **WHEN** the backend signals stream completion
- **THEN** the chat UI marks the assistant message as finished and re-enables sending

### Requirement: Chat UI surfaces backend error and gating states
The chat UI SHALL present a distinguishable, user-visible state for each error condition the backend can return, instead of leaving the conversation in a silently broken or ambiguous state.

#### Scenario: Out of credits
- **WHEN** the backend responds with an out-of-credits condition
- **THEN** the chat UI shows a visible out-of-credits state and does not display a fabricated assistant reply

#### Scenario: Rate limited
- **WHEN** the backend responds with a rate-limited condition
- **THEN** the chat UI shows a visible rate-limited state and does not display a fabricated assistant reply

#### Scenario: Stream error mid-response
- **WHEN** the backend emits an error event after streaming has started
- **THEN** the chat UI shows a visible error state on that message rather than presenting the partial text as a complete, successful reply
