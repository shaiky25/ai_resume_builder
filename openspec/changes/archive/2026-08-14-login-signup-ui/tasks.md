## 1. Browser Supabase client & session state

- [x] 1.1 Add `src/lib/supabase/browserClient.ts`: browser-side Supabase client factory using the anon key, default `persistSession: true`
- [x] 1.2 Add an `AuthProvider` + `useAuthSession` context exposing `{ session, user, loading }`, backed by `supabase.auth.getSession()` on mount and `supabase.auth.onAuthStateChange` thereafter
- [x] 1.3 Wrap the app with `AuthProvider` in `src/app/layout.tsx`

## 2. Login page

- [x] 2.1 Add `src/app/login/page.tsx`: single page with sign-in/sign-up toggle, no full navigation between the two
- [x] 2.2 Implement Email/Password sign-up (`supabase.auth.signUp`), surfacing "already registered" and other errors inline
- [x] 2.3 Implement Email/Password sign-in (`supabase.auth.signInWithPassword`), surfacing invalid-credential errors inline
- [x] 2.4 Implement "Continue with Google" (`supabase.auth.signInWithOAuth`) with `redirectTo` set to the app's origin + `/`, available from both sign-in and sign-up views
- [x] 2.5 On successful authentication (any method), redirect to `/`
- [x] 2.6 Verify in Supabase Dashboard → Auth → URL Configuration → Redirect URLs that the current dev origin (and deployed origin, if available) is allow-listed for Google OAuth

## 3. Root page split (landing vs. chat gate)

- [x] 3.1 Extract the existing mocked chat markup/logic from `src/app/page.tsx` into `src/components/chat/ChatExperience.tsx`, unchanged in behavior
- [x] 3.2 Add a `LandingView` component: product walkthrough (placeholder GIF asset for now — see design.md Open Questions) plus a "Start chatting" call to action
- [x] 3.3 Rewrite `src/app/page.tsx` as a thin conditional on `useAuthSession()`: loading placeholder while resolving, `LandingView` if anonymous, `ChatExperience` if authenticated
- [x] 3.4 Wire `LandingView`'s "Start chatting" CTA to redirect to `/login`

## 4. Verification

- [x] 4.1 Manually verify: anonymous visitor loads `/` and sees the landing view, not the chat interface
- [x] 4.2 Manually verify: clicking "Start chatting" while anonymous redirects to `/login` with no message sent
- [x] 4.3 Manually verify: Email/Password sign-up creates a new account and lands the visitor on the authenticated chat view at `/`
- [x] 4.4 Manually verify: Email/Password sign-up with an already-registered email shows an inline error and does not create a duplicate account
- [x] 4.5 Manually verify: Email/Password sign-in with correct and incorrect credentials both behave per spec (success vs. inline error)
- [x] 4.6 Manually verify: Google sign-in completes and lands the visitor on the authenticated chat view at `/`
- [x] 4.7 Manually verify: reloading the page after authentication keeps the visitor signed in (no flash back to the landing view)
- [x] 4.8 Revisit `db-layer-data-management` task 1.3 (same-`user_id` verification across providers) now that a real signup flow exists
