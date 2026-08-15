## Why

`login-signup-ui` now gates real, authenticated users into the chat page, but the chat surface itself (`ChatExperience`/`ChatPane`) is still the earliest bare-bones scaffold: plain text bubbles, no timestamps or avatars, an unstyled input, and no ambient sense of "you're talking to an AI agent." Now that this is the first thing a real signed-up user sees, it should read as a polished product surface, not a placeholder.

## What Changes

- Add visual/interaction polish to the message list: per-role avatars, timestamps, animated message entry, lightweight markdown rendering (bold/italic/inline code/line breaks) of message text, and a "thinking" indicator shown while the assistant is composing (`isStreaming` before content arrives).
- Add input affordances: suggested prompt chips shown before the first message is sent, an auto-resizing textarea, a visible keyboard-shortcut hint ("Enter to send, Shift+Enter for a new line"), and a richer visual state for voice recording (animated pulse/waveform while `isRecording`).
- Add ambient/branding treatment to the chat surface: a subtle animated/gradient background, transition/motion when moving from empty-conversation to active-conversation state, and an illustrated empty state before the first message.
- All animation is CSS-only (Tailwind transitions/keyframes); markdown rendering is a small first-party formatter for a limited safe subset (bold/italic/code/line breaks) — **no new npm dependency** is introduced by this change (see design.md for why).
- Purely presentational/interaction layer: no change to the mocked send/streaming timing, message data shape, `isStreaming`/`isRecording`/`isAudioInput` state semantics, or the (still out-of-scope) real `/api/chat` wiring.

## Capabilities

### New Capabilities
- `chat-message-presentation`: avatars, timestamps, animated entry, inline markdown formatting, and an assistant "thinking" indicator in the message list.
- `chat-input-affordances`: suggested prompt chips, auto-resizing input, keyboard-shortcut hint, and richer voice-recording visual state.
- `chat-ambient-branding`: animated/gradient ambient background and an illustrated empty state for the chat surface.

### Modified Capabilities
(none — `chat-message-input`'s and `voice-input-toggle`'s existing requirements around send-on-Enter, disabled-while-streaming, single send path, and the `isAudioInput`/stub-hook interface are unchanged; this change only adds presentation on top of that existing behavior)

## Impact

- Modified: `ai_resume_builder/src/components/chat/ChatExperience.tsx`, `ChatPane.tsx`.
- New: small presentational subcomponents under `ai_resume_builder/src/components/chat/` (e.g. a message-bubble/avatar component, a thinking indicator, prompt-chip list) — exact breakdown decided in design.md.
- New: CSS keyframes/utility classes in the app's global stylesheet for ambient motion.
- No new dependencies, no backend/API changes, no change to `ResumeDraft`. `ChatMessage` gains one optional field (a creation timestamp) to support the timestamp requirement — see design.md.
