## 1. Route Scaffolding

- [x] 1.1 Create `POST /api/chat` Route Handler
- [x] 1.2 Wire up server-side Supabase client (JWT verification) and separate service-role client

## 2. Authentication

- [x] 2.1 Verify Supabase JWT from the incoming request before any other logic
- [x] 2.2 Reject unauthenticated/invalid-JWT requests with an appropriate error response
- [x] 2.3 Derive user identity exclusively from the verified JWT, ignoring any client-supplied user ID

## 3. Rate Limiting

- [x] 3.1 Implement per-user rate limit tracking (independent of credit balance)
- [x] 3.2 Reject requests exceeding the rate limit before credit check or Claude call

## 4. Credit Gate and Reservation

- [x] 4.1 Read authenticated user's credit balance from `user_credits`
- [x] 4.2 Return `403 Forbidden` with a distinguishable "out-of-credits" body when balance is insufficient, with no Claude call
- [x] 4.3 Implement atomic reserve/decrement (single conditional update) before opening the Claude stream
- [x] 4.4 Implement compensating refund entry on Claude error or dropped connection mid-stream

## 5. Prompt Assembly

- [x] 5.1 Store/load the Impact-Writer Master Prompt server-side only
- [x] 5.2 Fetch the authenticated user's LinkedIn/resume context from Supabase (not from client input)
- [x] 5.3 Compose Master Prompt + user context into the final Claude request, immediately before the API call
- [x] 5.4 Verify no code path returns Master Prompt content in a response or error payload

## 6. Streaming

- [x] 6.1 Open the Claude stream after successful reservation
- [x] 6.2 Proxy the stream to the client via SSE/`ReadableStream`
- [x] 6.3 Signal stream completion distinctly from a dropped connection

## 7. Post-Stream Logging

- [x] 7.1 Write an analytics event reflecting actual usage on stream completion
- [x] 7.2 Write a ledger entry reflecting actual usage on stream completion (dependent on `credit_ledger`/`analytics_events` tables existing — see design.md Open Questions)

## 8. Validation

- [x] 8.1 Integration test: unauthenticated request is rejected before any credit/Claude logic
- [x] 8.2 Integration test: insufficient-credit request returns 403 with no Claude call and no balance change
- [x] 8.3 Integration test: concurrent requests from a user with one credit only let one succeed
- [x] 8.4 Integration test: simulated Claude error after reservation results in a refund ledger entry
- [x] 8.5 Integration test: rate-limited user is rejected even with sufficient credits
