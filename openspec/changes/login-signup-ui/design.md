## Context

Today there is no browser-side Supabase client anywhere in `ai_resume_builder/src` — `serverClient.ts` and `serviceClient.ts` are both Node-only, constructed per-request/singleton with `persistSession: false`, and neither is usable from a client component. `src/app/page.tsx` is a single client component rendering the full (mocked) chat experience unconditionally. There is no middleware and no cookie handling anywhere in the app. See proposal.md for why this change exists.

## Goals / Non-Goals

**Goals:**
- Add the first browser-side Supabase client and a minimal way for client components to read "is there a session, and who is it" without prop drilling.
- Split `/` into an anonymous landing view and the existing (still-mocked) authenticated chat view, gated purely on client-side session state.

**Non-Goals:**
- No middleware, no cookie-based session, no SSR-aware auth (explicit user decision — see proposal.md's session strategy).
- No change to `/api/chat`, `serverClient.ts`, or how the backend verifies requests — this change only makes the frontend capable of supplying a real bearer token; actually wiring the chat UI to call `/api/chat` with it is separate, future work.
- No password-strength UI beyond surfacing Supabase Auth's own validation errors.

## Decisions

**Browser client as a small factory, not a new abstraction layer.** Add `src/lib/supabase/browserClient.ts` mirroring the existing `serviceClient.ts` singleton pattern, but with default `persistSession: true` (Supabase's default browser storage, `localStorage`) so a signed-in visitor stays signed in across reloads. No new dependency — `@supabase/supabase-js` already supports this.

**Auth state via a small React context, not a state library.** A `AuthProvider`/`useAuthSession` context (new, under `src/lib/supabase/` or `src/components/auth/`) wraps the app in `layout.tsx`, calls `supabase.auth.getSession()` on mount, and subscribes to `supabase.auth.onAuthStateChange` to stay current after login/logout/token refresh. This is the one piece of shared state both `/login` and `/` need; a full state library would be overkill for one boolean-ish value (session present/absent + user id).

**No `?redirect=` param.** Because login always redirects to `/`, and `/` already renders the chat view whenever a session exists, an anonymous visitor bounced to `/login` while trying to chat lands back at the chat view automatically post-login — no need to track or restore "where they were trying to go."

**Root page split by extraction, not duplication.** Move the existing mocked chat markup/logic out of `page.tsx` into its own component (e.g. `src/components/chat/ChatExperience.tsx`), and make `page.tsx` a thin conditional: loading state while session resolves → `LandingView` (new) if anonymous → `ChatExperience` if authenticated. This keeps the existing mocked chat behavior byte-for-byte, just relocated.

**Landing view send-attempt gating happens at the same conditional, not deep in `ChatInput`.** The landing view is a separate component tree from `ChatExperience` (it doesn't render `ChatInput` unauthenticated), so "attempting to send while anonymous" is naturally impossible from the landing view itself — the landing view's own CTA (e.g. "Start chatting") is what triggers the redirect to `/login`, satisfying the spec's intent without needing an auth check inside the chat components.

**Google OAuth redirect target.** `signInWithOAuth({ provider: "google", options: { redirectTo: <origin>/ } })` sends the browser back to `/` after the Google consent screen. This requires the app's origin(s) (`http://localhost:3000` for dev, plus the deployed origin) to be present in Supabase Dashboard → Auth → URL Configuration → Redirect URLs — a dashboard step, tracked as a task, not code.

**Error display: inline, using Supabase's own error messages.** Supabase Auth's error strings (e.g. "Invalid login credentials", "User already registered") are already user-presentable; no custom error-mapping layer.

## Risks / Trade-offs

- **[Risk]** Session lives in `localStorage`, readable by any script on the page (XSS exposure) → **Mitigation**: accepted trade-off of the explicitly-chosen simple session strategy; revisit with the cookie/SSR approach later if this becomes a real threat model concern.
- **[Risk]** Brief "flash" of the landing view before `getSession()` resolves on first load → **Mitigation**: `AuthProvider` exposes a `loading` state; `page.tsx` renders nothing (or a minimal placeholder) until it resolves, rather than flashing landing-then-chat.
- **[Risk]** Google OAuth breaks in an environment whose origin isn't in the Redirect URLs allowlist (e.g. works on localhost, silently fails in preview/prod) → **Mitigation**: task to verify the allowlist per environment before considering this change done.
- **[Risk]** The mocked chat component's code still ships in the JS bundle to anonymous visitors (client-side-only gating has no server enforcement) → **Mitigation**: acceptable now since the chat is mocked and holds no secrets; if/when real chat wiring lands, that change should reassess whether server-side protection is warranted.

## Migration Plan

No data migration. Purely additive frontend code plus a Supabase Dashboard Redirect URL entry if the current dev/deploy origin isn't already listed. Rollback is a plain revert of the frontend change — no destructive or hard-to-reverse steps involved.

## Open Questions

- Source/format of the landing view's product-walkthrough GIF is not yet decided — doesn't affect the spec, approach, or task breakdown (it's just an asset path to drop in), so deferred until implementation.
