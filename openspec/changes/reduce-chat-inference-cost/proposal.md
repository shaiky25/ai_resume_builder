## Why

`POST /api/chat` currently spends two `claude-opus-5` calls per user message — one for the conversational reply, one for the mechanical resume-field extraction that follows it — with no prompt caching on the static master prompt/resume context and no bound on how much conversation history gets re-sent to the extraction call. Extraction cost grows O(n²) with conversation length, and the highest-priced model tier is applied uniformly to a fixed-schema tool-use call that doesn't need it. Before this app goes to a general public audience with no per-user usage ceiling beyond the existing credit gate, this uncontrolled per-turn cost is the largest lever on the inference bill and needs fixing first.

## What Changes

- Split model selection by call shape: the extraction call (`resumeExtraction.ts`) moves off `claude-opus-5` to a cheaper tier suited to fixed-schema tool-use; the conversational call is re-evaluated against actual quality needs rather than left as an inherited default.
- Add prompt caching (`cache_control` breakpoints) to the composed system prompt in `promptComposer.ts` so the master prompt and the user's resume/LinkedIn context are cached across turns within a session instead of re-billed as fresh input tokens every message.
- Bound the conversation payload sent to `extractResume` so extraction cost no longer grows unboundedly with conversation length (e.g. incremental/windowed re-send instead of the full transcript every turn).
- **BREAKING**: none — this changes internal model/token behavior only; request/response contracts on `POST /api/chat` are unchanged.

## Capabilities

### New Capabilities
- `chat-inference-cost-controls`: model-tier selection per call type (conversational vs. extraction) and prompt-caching/context-bounding behavior for the composed system prompt and the resume-extraction call.

### Modified Capabilities
(none — existing capabilities like `chat-system-prompt-injection` govern *where* the prompt is assembled and that it stays server-side; this change doesn't alter those requirements, only the cost/caching mechanics of assembly.)

## Impact

- `ai_resume_builder/src/lib/chat/anthropicClient.ts` — model constant(s), currently a single `CHAT_MODEL` used for both call types.
- `ai_resume_builder/src/lib/chat/resumeExtraction.ts` — `extractResume`'s model choice and the conversation slice it sends.
- `ai_resume_builder/src/lib/chat/promptComposer.ts` — system prompt assembly, needs `cache_control` breakpoints.
- `ai_resume_builder/src/lib/chat/handleChatRequest.ts` — the call site that assembles the extraction conversation array (`[...history, newMsg, newAssistantMsg]`) currently passed unbounded to `extractResume`.
- No database schema or client-facing API changes.
