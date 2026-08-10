## Context

See proposal.md - Why. This route is the only server-side surface in the app: a single Next.js Route Handler at `/api/chat` sitting between the client and Anthropic. It depends on the Data & Management layer's `user_credits` table (`db-layer-data-management` change) and is the only caller permitted to hold the Supabase service-role key.

## Goals / Non-Goals

**Goals:**
- Make it structurally impossible for an unauthenticated or under-balance request to reach Claude.
- Make the reserve-before-call pattern race-safe under concurrent requests from the same user.
- Keep the Master Prompt and raw resume/LinkedIn context out of every client-visible payload, including error paths.

**Non-Goals:**
- Choosing the Claude model, `max_tokens`, or prompt template internals (configured here, not designed here).
- Defining the `credit_ledger` / `analytics_events` table schemas themselves (Data layer's responsibility, satisfied by `db-layer-data-management`).
- Frontend rendering of streamed tokens or the out-of-credits UI state.

## Decisions

- **Reserve-before-call, not check-then-call**: the credit gate (read) and the reservation (write) are two distinct steps, with the reservation happening atomically (e.g. a single `UPDATE ... WHERE credits_remaining >= cost RETURNING ...` or an equivalent conditional decrement) rather than a separate read-then-write. Alternative considered: decrement after a successful Claude call — rejected per the source spec, since that allows concurrent requests to race past a stale balance read.
- **Refund via compensating ledger entry, not reversing the original row update**: failures write a new ledger row rather than mutating the original reservation, preserving an audit trail of what was reserved and what was refunded. Alternative considered: revert the balance in place — rejected because it destroys the record of the reservation ever happening, making reconciliation harder.
- **Service-role key lives only inside this route**, never passed to or derived from client input, matching the Data layer's requirement that `user_credits` have no client-writable policy.
- **Prompt composition happens after context fetch, not before**: the Master Prompt template and the user's Supabase-fetched context are combined server-side in a single step immediately before the Claude call, so there is no intermediate state where the composed prompt could be logged or returned to the client by accident.
- **Streaming via `ReadableStream`/SSE passthrough**: Claude's stream is piped to the client as it arrives rather than buffered, so first-token latency isn't held hostage to full completion.

## Risks / Trade-offs

- [Risk] Concurrent requests from the same user could still race if the reservation isn't a single atomic conditional update → Mitigation: implement reservation as one atomic SQL statement (conditional decrement), not a separate read-then-write from application code.
- [Risk] A dropped connection mid-stream might not reliably trigger the refund path if the server process itself is killed → Mitigation: treat refund as idempotent and reconcilable from the ledger (a reservation with no matching completion or refund after a timeout window is a detectable, reconcilable state), not purely reliant on an in-request `finally` block.
- [Risk] Rate limiting and credit gating are independent checks that could be implemented in a way that lets one bypass the other → Mitigation: both are still required to pass in in the request path in order (rate limit → auth is already first; rate limit and credit gate can run in either order relative to each other, but both must gate before any Claude call).

