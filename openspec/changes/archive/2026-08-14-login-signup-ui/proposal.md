## Why

The root page (`src/app/page.tsx`) is currently a fully mocked chat UI with no auth: anyone can "use" it, and there is no way to reach a real, authenticated session. `db-layer-data-management`'s task 1.3 (verify Email/Password and Google OAuth produce the same `user_id`) has been deferred specifically because no signup/login flow exists yet. This change builds that flow so real accounts can be created and used, and so the app can start distinguishing anonymous visitors from logged-in users.

## What Changes

- Add a dedicated `/login` route: a single page toggling between sign-in and sign-up, supporting both Email/Password and "Continue with Google" (both providers already configured in Supabase Auth per `db-layer-data-management`).
- Session strategy stays simple: on successful auth, the Supabase session (including access token) is kept client-side (browser `supabase-js` client, session persisted to storage) and attached as `Authorization: Bearer <token>` on calls to `/api/chat`. **No changes to `serverClient.ts`, no middleware, no cookie-based SSR session.**
- Split the root page into two states:
  - **Anonymous visitor**: a landing/demo view — no login required, shows a GIF (or short walkthrough) of how the chat-to-resume flow works, with a call to action to start chatting.
  - **Authenticated user**: the existing chat interface (today's mocked `page.tsx` content, unchanged in this scope).
- Attempting to start a chat (send a message) while anonymous redirects to `/login`; after successful login the user is sent back to `/` and lands in the chat interface.
- After login, redirect to `/`.
- **BREAKING**: none — the app has no real users yet, so there is no existing session format to migrate.

Explicitly out of scope for this change: wiring the mocked chat UI to the real `/api/chat` endpoint (streaming, resume patches) — that remains mocked as-is; this change only adds the auth gate around it. Task 1.3's actual dual-provider `user_id` verification is also a separate, follow-up step once this UI exists (not re-scoped into this change).

## Capabilities

### New Capabilities
- `user-login`: the `/login` page itself — Email/Password sign-up/sign-in, Google OAuth sign-in, client-side session persistence, redirect back to `/` on success, error display for failed auth attempts.
- `chat-login-gate`: distinguishes anonymous vs. authenticated visitors on `/`, renders the landing/demo view for anonymous visitors, and redirects to `/login` when an anonymous visitor attempts to send a chat message.

### Modified Capabilities
(none — `chat-request-authentication`'s backend JWT-verification requirements are unchanged; this change makes the frontend actually supply the header that spec already assumes)

## Impact

- New files: `src/app/login/page.tsx` (or similar), a browser-side Supabase client factory (e.g. `src/lib/supabase/browserClient.ts` — no such client exists yet; today's `serviceClient.ts`/`serverClient.ts` are both server-only), an auth session hook/context for the app.
- Modified: `src/app/page.tsx` (split into anonymous landing view vs. authenticated chat view), `src/app/layout.tsx` if a shared auth context provider is added.
- New dependency: none required — `@supabase/supabase-js` (already a dependency) supports browser usage and session persistence out of the box.
- Asset: a walkthrough GIF (or equivalent) for the landing view — source/creation method TBD in design.md.
