## 1. Database migration

- [x] 1.1 Add a new Supabase migration adding `profiles.coach_persona` as `text`, nullable, with a `check (coach_persona in ('momentum', 'steady', 'bold'))` constraint (or equivalent native enum type, matching the project's existing fixed-choice column convention)
- [x] 1.2 Extend the existing owner-scoped RLS policy grants on `profiles` so `coach_persona` is readable and writable by the row's owner, following the same pattern as `display_name`
- [x] 1.3 Verify the constraint rejects an out-of-set value via a manual write attempt (or a migration test), and that a null value is still accepted (unset state)

## 2. Server-side prompt composition

- [x] 2.1 Add a persona tone-modifier module exposing one predefined tone-modifier block per fixed persona value (`momentum`, `steady`, `bold`)
- [x] 2.2 Update `handleChatRequest.ts` to fetch `coach_persona` from the authenticated user's `profiles` row server-side (never from client-supplied request data)
- [x] 2.3 Update `promptComposer.ts` to switch on the fetched persona value and append the matching tone-modifier block to the Impact-Writer Master Prompt; never interpolate the stored value directly into prompt text
- [x] 2.4 Confirm behavior when `coach_persona` is null (user mid-onboarding or pre-migration): prompt composition proceeds without a tone-modifier block, no error

## 3. Persona picker UI

- [x] 3.1 Build a new persona picker component presenting the three coaching styles (Momentum, Steady, Bold), each with a sample coach line
- [x] 3.2 Wire the picker's selection action to persist the choice to `profiles.coach_persona` for the authenticated user
- [x] 3.3 In `ChatExperience.tsx`, gate rendering of the chat surface on the presence of a stored persona: show the picker first for users with no stored persona, otherwise render the chat surface directly

## 4. Persona-aware chat surface

- [x] 4.1 Remove the old illustrated empty-conversation state from `ChatPane.tsx` / `MessageList.tsx`
- [x] 4.2 Add static, pre-written persona-voiced greeting content for each of the three personas
- [x] 4.3 Render the matching greeting as the first message immediately after persona selection, with no model call and no credit reservation
- [x] 4.4 Update suggested prompt chip copy so it varies by the selected persona, and confirm chips still appear only before the visitor's first sent message (the static greeting does not count as a user message)
- [x] 4.5 Add a "change coaching style" affordance to the chat header that reopens the picker and updates the stored persona on selection

## 5. Realtime read fallback

- [x] 5.1 Add a visibility-triggered refetch (`document.visibilitychange`) to the persona read path, refetching `coach_persona` when the tab regains visibility
- [x] 5.2 Add a refetch on the persona subscription's reconnect/`SUBSCRIBED` callback firing after a drop, mirroring the fetch-plus-subscribe shape already used in `usePremiumDownloadAccess.ts`

## 6. Validation

- [x] 6.1 Verify a new user sees the picker, selects a persona, and immediately sees the matching static greeting with no credit consumed
- [x] 6.2 Verify a returning user with a stored persona skips the picker and their chat responses reflect that persona's tone-modifier
- [x] 6.3 Verify the "change coaching style" affordance updates future responses' tone without requiring a new session
- [x] 6.4 Verify a client-supplied persona value in the request body cannot override the server-fetched value
- [x] 6.5 Run `openspec validate coach-persona-onboarding --strict` and confirm it passes
