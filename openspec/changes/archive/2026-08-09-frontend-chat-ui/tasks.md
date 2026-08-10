## 1. Chat Pane

- [x] 1.1 Build message list component rendering conversation history in order
- [x] 1.2 Build chat input component with send-on-Enter behavior
- [x] 1.3 Wire a single `sendMessage(text)` path shared by typed and voice-transcribed input
- [x] 1.4 Add disabled state to the input while a response is streaming, re-enabling on completion

## 2. Live Preview Pane

- [x] 2.1 Build preview pane component accepting an `isResumeReady` prop from the parent page
- [x] 2.2 Implement blurred rendering when `isResumeReady` is false
- [x] 2.3 Implement unblurred rendering when `isResumeReady` is true
- [x] 2.4 Add manual reveal control that overrides the blur regardless of `isResumeReady`

## 3. Voice Input Toggle (Stub)

- [x] 3.1 Add `isAudioInput` toggle state and UI control
- [x] 3.2 Define the stub hook's interface (start/stop, resulting text) without a real recording/transcription provider
- [x] 3.3 Verify the stub hook's output feeds the same send path as typed text

## 4. PDF Export

- [x] 4.1 Integrate `@react-pdf/renderer` for in-browser PDF compilation
- [x] 4.2 Trigger client-side download of the compiled PDF
- [x] 4.3 Verify no network request to server or Supabase Storage occurs during export

## 5. DOCX Export

- [x] 5.1 Integrate the `docx` library for in-browser DOCX compilation
- [x] 5.2 Trigger client-side download of the compiled DOCX
- [x] 5.3 Verify no network request to server or Supabase Storage occurs during export

## 6. Validation

- [x] 6.1 Manual/e2e check: Enter sends a message and clears input
- [x] 6.2 Manual/e2e check: input is disabled during a mocked streaming response and re-enables after
- [x] 6.3 Manual/e2e check: preview blur toggles correctly with `isResumeReady` and manual reveal
- [x] 6.4 Manual/e2e check: both PDF and DOCX exports succeed with no backend connectivity
