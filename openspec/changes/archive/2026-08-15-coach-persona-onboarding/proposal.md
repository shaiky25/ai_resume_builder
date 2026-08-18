## Why

New users land on a generic, low-energy empty chat screen with no sense of momentum, and the coach speaks in one fixed tone regardless of who's using it. For someone anxious about building a resume for a job search, nothing on that first screen signals progress or adapts to how they'd actually like to be coached. Letting the user choose a coaching style as their very first action — before typing anything — and having the coach visibly honor that choice immediately, replaces blank-page paralysis with an instant, personalized payoff.

## What Changes

- Replace the current generic chat empty-state (illustration + fixed suggested prompts) with a blocking persona picker shown once, before the chat surface renders, offering three coaching styles — Momentum, Steady, Bold — each shown with a sample coach line so the user can "hear" the tone before choosing.
- Persist the chosen persona per user (new `coach_persona` column on `profiles`, client-writable under the same RLS/grant pattern as `display_name`/`plan_tier`).
- Render a static, pre-written persona-voiced greeting as the first chat bubble immediately after selection — no LLM call, no credit spent, so the payoff is instant.
- Server-side prompt composition appends a persona-specific tone-modifier block to the Impact-Writer Master Prompt, read from the user's stored `profiles.coach_persona` — never from client-supplied request data, preserving the existing server-side trust boundary used for resume context.
- Suggested prompt chip copy adapts to the chosen persona's voice.
- Add a "change coaching style" affordance in the chat header so the choice isn't a one-time lock-in.

## Capabilities

### New Capabilities
- `coach-persona-onboarding`: the blocking picker screen shown before first use, persistence of the choice, the static persona-voiced first greeting, and the later switch-style affordance.

### Modified Capabilities
- `chat-system-prompt-injection`: system prompt composition appends a persona-specific tone-modifier, sourced server-side from the authenticated user's stored profile, never from client-supplied request data.
- `profiles-schema`: adds a client-writable `coach_persona` column, following the existing owner-scoped RLS/grant pattern.
- `chat-ambient-branding`: the illustrated empty-conversation state is superseded by the persona picker on a user's first visit; once a persona is chosen, the chat surface never shows the old generic empty state again.
- `chat-input-affordances`: suggested prompt chip copy varies by the selected persona instead of being fixed.

## Impact

- Affected code: `ChatExperience.tsx` (persona gate, fetch/store persona), a new persona picker component, `ChatPane.tsx` / `MessageList.tsx` (static first-greeting rendering), `promptComposer.ts` plus a new server-side persona tone-modifier module, `handleChatRequest.ts` (fetch persona from the user's profile rather than trusting request body), and a new Supabase migration adding `profiles.coach_persona`.
- No breaking change to existing chat behavior; users without a stored persona see the picker on their next login, then proceed as today.
