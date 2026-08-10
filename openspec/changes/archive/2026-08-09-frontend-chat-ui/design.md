## Context

See proposal.md - Why. This is client-side only (Next.js + Tailwind), built against an as-yet-unimplemented backend contract. It must not assume anything about how the Backend & Security layer implements streaming or auth beyond the event shapes it expects.

## Goals / Non-Goals

**Goals:**
- Keep voice and typed input on one send path so voice transcription can be added later without touching chat logic.
- Keep the preview pane's blur/reveal decision owned by the parent page (`isResumeReady`), not by the preview component itself, so whatever logic determines "enough structured content" can evolve independently of rendering.
- Keep both exports fully client-side with zero server/storage dependency.

**Non-Goals:**
- Implementing real voice transcription (react-media-recorder → Whisper/AssemblyAI) — stub only.
- Implementing authentication, credit balance UI, or the Claude streaming protocol's server side.
- Defining the Supabase schema this UI eventually reads from.

## Decisions

- **One send path for typed and voice text**: both input methods normalize to plain text before hitting a single `sendMessage(text)` function. Alternative considered: separate handlers per input source — rejected because it's exactly the coupling the proposal calls out to avoid; a later voice-provider swap would otherwise require touching send logic.
- **`isResumeReady` and `isAudioInput` are parent-owned state, passed down as props**: keeps the preview pane and voice toggle as largely presentational/stateless components, so the "when is a resume ready" and "what triggers real transcription" decisions can change without touching these components' internals. Alternative considered: local component state — rejected because both flags need to be inspectable/settable by logic elsewhere on the page (e.g. resume-readiness derived from streamed `resume_patch` events).
- **Voice hook stub returns the same shape a real implementation would**: the stub's interface (start/stop, resulting text, `isAudioInput`) is designed now so wiring in a real provider later is a drop-in swap of the hook's internals, not its call sites.
- **Exports run entirely client-side**: `@react-pdf/renderer` and `docx` both support in-browser generation and `Blob`-based downloads, so no server round trip or Supabase Storage write is needed for either format.

## Risks / Trade-offs

- [Risk] The frontend's assumed `resume_patch` stream event shape may not match what the Backend & Security layer actually implements → Mitigation: treat this as an explicit dependency/assumption (proposal.md - Impact) to be reconciled once the backend proposal's streaming capability is implemented; not a blocker for building this UI against a mocked stream now.
- [Risk] A stubbed voice hook with the wrong interface shape could still require send-path changes later if guessed incorrectly → Mitigation: keep the interface minimal (start, stop, transcribed text, isAudioInput) — the smallest shape common to Whisper/AssemblyAI-style APIs.
- [Risk] Large in-browser PDF/DOCX generation could block the main thread on big documents → Mitigation: out of scope for this proposal's correctness requirements, but worth revisiting (e.g. web worker) if real-world documents prove slow — noted here, not specified as a requirement since resumes are short documents.
