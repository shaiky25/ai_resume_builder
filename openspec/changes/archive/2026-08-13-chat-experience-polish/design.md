## Context

`ChatExperience` composes `ChatPane` (→ `MessageList` + `ChatInput`) and `PreviewPane`. `ChatMessage` is `{ id, role, text }` with no timestamp. `MessageList` renders each message as a plain colored bubble. `ChatInput` is a single-line `<input>` plus a mic-toggle button and a stub `useVoiceInput` hook (`isRecording`/`start`/`stop`, no real audio capture). `ChatExperience.sendMessage` mocks the assistant turn with a `setTimeout`; `isStreaming` is true for that whole window (no separate "first chunk" event exists yet — see Decisions). No markdown renderer, animation library, or icon set is installed. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- Make the existing message list, input, and chat surface feel like a considered product surface: presence, motion, formatting, and ambient identity.
- Do this without a new npm dependency, without touching the mocked send/streaming timing, and without changing `ChatPane`'s/`ChatInput`'s existing external props contracts in a breaking way (additive only).

**Non-Goals:**
- No real markdown (tables, links, images, nested lists) — only bold/italic/inline-code/line-breaks.
- No real audio waveform visualization tied to actual microphone amplitude — `useVoiceInput` is still a stub, so the "richer recording state" is a CSS animation keyed off `isRecording`, not real audio data.
- No accessibility regression: animations must respect `prefers-reduced-motion`; the thinking indicator and timestamps must not break the existing `role="log" aria-live="polite"` behavior.

## Decisions

**No new dependencies — CSS-only animation, first-party mini-formatter.** Tailwind's built-in `transition`/`animate`/custom `@keyframes` (added to the app's global stylesheet) cover every animation requirement here (message entry, thinking indicator, recording pulse, ambient background, empty→active transition). For inline formatting, a small first-party function (`formatInlineMarkdown` or similar, under `src/lib/chat/`) converts the supported subset (`**bold**`, `*italic*`, `` `code` ``, `\n` → `<br>`) to safe React nodes — not `dangerouslySetInnerHTML`, to avoid any injection surface from message text. Rejected: pulling in `react-markdown`/`framer-motion` — reasonable options, but unnecessary weight for four formatting marks and CSS-doable motion; revisit only if a future change needs real markdown (tables/links) or physics-based motion.

**Timestamp: add `createdAt: number` to `ChatMessage`, set at creation in `ChatExperience.sendMessage`.** The type gains one optional-at-the-type-level-but-always-populated field; both the user message and the mocked assistant message get `Date.now()` when constructed. This is the only data-shape change in this proposal.

**"Thinking" indicator is a derived render state, not new state.** `MessageList` already receives `messages` and `isStreaming`; the parent (`ChatPane`) additionally passes `isStreaming` through so `MessageList` can render a trailing indicator row when `isStreaming && !isResumeReady-for-this-turn` — concretely: show the indicator whenever `isStreaming` is true and the most recent message is from the user (i.e., no assistant reply has landed for that turn yet). No new boolean is introduced; this is computed from existing props.

**Prompt chips live in `ChatPane`, gated on `messages.length === 0`.** A small static list of suggested prompts (e.g. "Help me describe my last role", "What makes a resume stand out?") lives alongside `ChatInput`; selecting one calls the existing `onSend` prop — same path as typed text, per `chat-message-input`'s single-send-path requirement. No new prop needed on `ChatPane` since it already has `onSend`.

**Auto-resize via a `textarea` instead of `input`.** `ChatInput`'s text-mode control changes from `<input type="text">` to an auto-growing `<textarea>` (height driven by `scrollHeight`, capped with `max-h-*`), with Enter-to-send/Shift+Enter-for-newline handled in its `onKeyDown`. This is an internal implementation change to `ChatInput`; its external props are unchanged.

**Ambient background and empty-state illustration are presentational-only additions to `ChatPane`/`MessageList`.** A CSS gradient/animated background sits behind `ChatPane`'s content (via a positioned pseudo-layer, not affecting layout); the empty state (`messages.length === 0`) renders a simple inline SVG illustration (first-party, no image asset pipeline needed) above the prompt chips.

**Reduced motion.** All new `@keyframes` are wrapped so `@media (prefers-reduced-motion: reduce)` disables them (opacity/position settle immediately, no infinite pulse/gradient animation).

## Risks / Trade-offs

- **[Risk]** A first-party inline-markdown formatter is a small hand-rolled parser — a narrower but real maintenance surface vs. a battle-tested library. → **Mitigation**: scope strictly to 4 fixed patterns with unit tests; do not extend it ad hoc — if requirements grow, revisit `react-markdown` as a follow-up change.
- **[Risk]** Deriving the "thinking indicator" from `isStreaming` + last-message-role is a heuristic, not a dedicated state, so it could misfire if the mocked send logic changes shape later. → **Mitigation**: the real `/api/chat` wiring (future, separate change) will need its own explicit "assistant turn started" signal anyway; this heuristic is scoped to the current mock and expected to be revisited then.
- **[Risk]** Ambient background/animation could hurt perceived performance or clash with `PreviewPane` styling. → **Mitigation**: keep the background CSS-only (no JS animation loop), test alongside `PreviewPane` visually before calling this done.

## Migration Plan

No data migration — `createdAt` is populated going forward only (this app has no persisted chat history yet). Purely additive frontend/CSS change; rollback is a plain revert.
