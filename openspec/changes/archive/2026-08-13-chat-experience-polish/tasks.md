## 1. Data shape & formatting utility

- [x] 1.1 Add `createdAt: number` to `ChatMessage` (`src/types/chat.ts`); set `Date.now()` when constructing both the user and mocked assistant messages in `ChatExperience.sendMessage`
- [x] 1.2 Add a first-party `formatInlineMarkdown` helper (e.g. `src/lib/chat/formatInlineMarkdown.ts`) that converts `**bold**`, `*italic*`, `` `code` ``, and `\n` into safe React nodes (no `dangerouslySetInnerHTML`), leaving unsupported markup as plain text
- [x] 1.3 Add global CSS keyframes (message entry, thinking-dot pulse, recording pulse, ambient background motion) to the app's global stylesheet, each guarded under `@media (prefers-reduced-motion: reduce)`

## 2. Message presentation (`chat-message-presentation`)

- [x] 2.1 Add a per-role avatar indicator to each message row in `MessageList`
- [x] 2.2 Render each message's timestamp (from `createdAt`) next to its bubble
- [x] 2.3 Apply the message-entry animation to newly appended messages
- [x] 2.4 Render message text through `formatInlineMarkdown` instead of raw text
- [x] 2.5 Add a "thinking" indicator row, shown when `isStreaming` is true and the latest message is from the user; replaced automatically once the assistant message is appended

## 3. Input affordances (`chat-input-affordances`)

- [x] 3.1 Add a suggested-prompt-chips row in `ChatPane`, shown only when `messages.length === 0`; selecting a chip calls the existing `onSend`
- [x] 3.2 Replace `ChatInput`'s single-line `<input>` with an auto-resizing `<textarea>` (grows with content up to a max height), preserving existing `disabled`/`onSend` behavior
- [x] 3.3 Handle Enter-to-send / Shift+Enter-for-newline in the textarea's `onKeyDown`
- [x] 3.4 Add a visible keyboard-shortcut hint near the input
- [x] 3.5 Add an animated recording-active visual state to the mic/record control, driven by `isRecording`

## 4. Ambient branding (`chat-ambient-branding`)

- [x] 4.1 Add an ambient gradient/animated background layer behind `ChatPane`'s content (positioned so it doesn't affect layout or scroll)
- [x] 4.2 Add an inline SVG empty-state illustration shown alongside the prompt chips when `messages.length === 0`
- [x] 4.3 Animate the transition from the empty state to the active-conversation state when the first message is sent

## 5. Verification

- [x] 5.1 Manually verify: avatars, timestamps, and animated entry appear correctly for both user and assistant messages
- [x] 5.2 Manually verify: bold/italic/inline-code/line-break formatting renders correctly; unsupported markup falls back to plain text without errors
- [x] 5.3 Manually verify: thinking indicator appears immediately after sending a message and is replaced when the mocked assistant reply lands
- [x] 5.4 Manually verify: prompt chips appear on an empty conversation, send correctly when clicked, and disappear after the first message
- [x] 5.5 Manually verify: textarea auto-resizes with multi-line input, Enter sends, Shift+Enter inserts a line break, and the shortcut hint is visible
- [x] 5.6 Manually verify: toggling voice input and starting/stopping recording shows the animated recording state
- [x] 5.7 Manually verify: ambient background, empty-state illustration, and empty→active transition all render, and animations pause/simplify under OS-level reduced-motion settings
- [x] 5.8 Manually verify: no regression to existing behavior — send-on-Enter, input disabled while streaming, sign-out, and the landing/login/chat-gate flow from `login-signup-ui` all still work
