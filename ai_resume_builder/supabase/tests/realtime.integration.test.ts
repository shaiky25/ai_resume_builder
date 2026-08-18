import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { RealtimePostgresChangesPayload, SupabaseClient } from "@supabase/supabase-js";
import {
  createTestUser,
  deleteTestUser,
  getServiceClient,
  hasLiveSupabaseEnv,
  type TestUser,
} from "./testHelpers";

// Covers task 5.2 against a live Supabase project. Requires the
// `supabase_realtime` publication to include user_credits (migration
// 20260812000003) and Realtime to be enabled for the project.
describe.skipIf(!hasLiveSupabaseEnv)("user_credits realtime scoping", () => {
  let service: SupabaseClient;
  let userA: TestUser;
  let userB: TestUser;

  beforeAll(async () => {
    service = getServiceClient();
    userA = await createTestUser(service);
    userB = await createTestUser(service);
  });

  afterAll(async () => {
    if (userA) await deleteTestUser(service, userA.id);
    if (userB) await deleteTestUser(service, userB.id);
  });

  function subscribeToOwnRow(user: TestUser) {
    const events: RealtimePostgresChangesPayload<Record<string, unknown>>[] = [];
    const channel = user.client.channel(`user_credits_test_${user.id}`).on(
      "postgres_changes",
      { event: "UPDATE", schema: "app", table: "user_credits", filter: `user_id=eq.${user.id}` },
      (payload) => events.push(payload)
    );
    const subscribed = new Promise<void>((resolve, reject) => {
      channel.subscribe((status, err) => {
        if (status === "SUBSCRIBED") resolve();
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") reject(err ?? new Error(status));
      });
    });
    return { channel, events, subscribed };
  }

  it("subscriber receives an update to their own row, but not to another user's row", async () => {
    const a = subscribeToOwnRow(userA);
    const b = subscribeToOwnRow(userB);

    // Wait for both channels to actually reach SUBSCRIBED before mutating —
    // Realtime does not replay events emitted before a channel finishes joining.
    await Promise.all([a.subscribed, b.subscribed]);

    const { error } = await service.from("user_credits").update({ credits_remaining: 7 }).eq("user_id", userA.id);
    expect(error).toBeNull();

    await new Promise((resolve) => setTimeout(resolve, 2000));

    expect(a.events.length).toBeGreaterThanOrEqual(1);
    expect(a.events[0]?.new?.credits_remaining).toBe(7);
    expect(b.events).toHaveLength(0);

    await a.channel.unsubscribe();
    await b.channel.unsubscribe();
  });
});
