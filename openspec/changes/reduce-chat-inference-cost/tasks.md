## 1. Model Tier Split (Extraction vs Conversational)

- [x] 1.1 Add independent model configuration for the extraction call, separate from the conversational call's model constant
- [x] 1.2 Default the extraction model to `claude-haiku-4-5-20251001`; keep the conversational model on `claude-opus-5`
- [x] 1.3 Update `extractResume`'s call site to read the extraction model from its own configuration
- [x] 1.4 Integration test: extraction and conversational calls are configured with independent model values (matches `chat-inference-cost-controls` spec scenario)

## 2. Prompt Caching

- [x] 2.1 Add a single `cache_control` breakpoint to the composed system prompt covering the master prompt + resume/LinkedIn context together
- [x] 2.2 Ensure the cache breakpoint is invalidated when `resumeContext` changes (tied to when `structured_output`/`raw_text` was last updated), not on every turn regardless of change
- [x] 2.3 Confirm the minimum-cacheable-token threshold for the models in use against current Anthropic API docs (resolves design.md's open question) and verify the combined block clears it
- [x] 2.4 Integration test: two consecutive turns with unchanged resume context both reference the same cache-eligible prompt content
- [x] 2.5 Integration test: a turn following a resume-context update does not reuse the stale cached block

## 3. Model Tier Evaluation (Haiku vs Sonnet)

- [ ] 3.1 Assemble a small eval set (~10-15 sample conversations, varying messiness/ambiguity) with hand-checked expected structured-extraction output — run manually/locally against the real API, not part of the automated test suite
- [ ] 3.2 Run the eval set through Haiku 4.5 extraction; record field-level accuracy
- [ ] 3.3 Run the same eval set through Sonnet 5 extraction; record field-level accuracy
- [ ] 3.4 Decide whether to keep Haiku as the extraction default or move to Sonnet, per the accuracy criterion in design.md's Decision 1
- [ ] 3.5 Record the outcome and rationale (e.g. in design.md or a short follow-up note) so the choice isn't silently lost

## 4. Incremental (Bounded) Extraction

- [x] 4.1 Change the extraction call's input from the full conversation transcript to the previously persisted `structured_output` plus only the latest user/assistant turn
- [x] 4.2 Update the extraction tool's prompt wording to frame the call as merging/updating an existing record, preserving prior fields not mentioned in the latest turn, rather than re-deriving from scratch
- [ ] 4.3 Re-run the eval set from Task Group 3 against the reworded tool prompt, confirming merge behavior preserves previously extracted fields and correctly applies stated corrections
- [x] 4.4 Integration test: extraction payload size stays constant regardless of total conversation length (matches `chat-inference-cost-controls` spec scenario)
- [x] 4.5 Integration test: a correction stated in a later turn overrides an earlier extracted field
- [x] 4.6 Integration test: a field established in an early turn and never repeated is still present in the structured output after later turns

## 5. Validation

- [ ] 5.1 Compare `usageLogger`-recorded input/output token counts per turn before and after this change, confirming a measurable reduction
- [ ] 5.2 Regression pass: existing `handleChatRequest.test.ts` and related extraction tests still pass
- [ ] 5.3 Manual end-to-end pass: a multi-turn conversation still produces a correct, live-updating resume preview under the new model/caching/extraction behavior

## 6. Post-Launch Extraction-Quality Monitoring

- [x] 6.1 Add a lightweight signal for degraded extraction output (e.g. empty/near-empty `structured_output` written after a turn that clearly contained resume-relevant content) recorded alongside the existing `usageLogger` per-turn logging
- [x] 6.2 Integration test: a turn where extraction returns an empty/near-empty result records the degraded-output signal (matches `chat-inference-cost-controls` spec scenario)
- [x] 6.3 Document, in a short note alongside design.md's Decision 1 outcome (task 3.5), how to review this signal periodically post-launch — this is a manual review process, not an automated alert, consistent with this change's eval process being a local/manual exercise
