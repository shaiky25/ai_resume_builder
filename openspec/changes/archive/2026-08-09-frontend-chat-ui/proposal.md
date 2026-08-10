## Why

The product's core interaction is a chat-driven, human-feeling career-coach conversation with a live resume preview — the frontend needs this scaffolding in place before voice input or export can be wired up, and before it can be pointed at a real backend streaming contract.

## What Changes

- Add a chat pane (message list + input) that sends on Enter and disables input while a response streams.
- Add a live document preview pane, blurred until the resume has enough structured content to be worth showing (`isResumeReady`, owned by the parent page) or until the user manually reveals it.
- Add a voice input toggle (`isAudioInput` state) with a stubbed recording/transcription hook, wired so a later change can drop in the real provider (react-media-recorder → Whisper/AssemblyAI) without touching the chat send path. Voice-transcribed text and typed text share one send path with no branching downstream of input capture.
- Add browser-side PDF export (`@react-pdf/renderer`), compiling and downloading entirely client-side.
- Add browser-side DOCX export (`docx` library), compiling and downloading entirely client-side.

## Capabilities

### New Capabilities
- `chat-message-input`: Chat message list + input component, with send-on-Enter and a disabled state while a response streams.
- `resume-preview-pane`: Live document preview pane with blur/reveal behavior tied to an `isResumeReady` flag.
- `voice-input-toggle`: Voice input toggle hook (state + wiring only, no transcription provider yet).
- `pdf-export`: Browser-side PDF export.
- `docx-export`: Browser-side DOCX export.

### Modified Capabilities
(none — this is the first change establishing the frontend layer)

## Impact

- **Affected code**: client-side Next.js pages/components only; no server logic in this proposal.
- **Depends on** (referenced as assumptions, not specified here): the Backend & Security layer's `/api/chat` route is expected to emit a `resume_patch` stream event shape the chat pane can consume to update the live preview; authentication state and credit-balance/out-of-credits UI state are assumed to be provided by layers outside this proposal.
- **Out of scope**: authentication, credit balance logic, the Claude streaming protocol's server-side implementation, Supabase schema. This proposal describes what the frontend needs from them, not how those layers implement it.
- **No breaking changes**: this is the initial frontend layer.
