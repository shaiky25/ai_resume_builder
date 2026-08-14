import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createTestUser,
  deleteTestUser,
  getServiceClient,
  hasLiveSupabaseEnv,
  type TestUser,
} from "./testHelpers";

// Covers tasks 3.5, 3.9, 3.10, 6.1, 6.2 against a live Supabase project.
// Requires SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY —
// see README.md in this directory. Inert (no tests run) otherwise.
describe.skipIf(!hasLiveSupabaseEnv)("db-layer RLS boundaries", () => {
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

  describe("profiles", () => {
    it("owner can read and update their own row", async () => {
      const { data: row } = await userA.client
        .from("profiles")
        .select("*")
        .eq("user_id", userA.id)
        .single();
      expect(row?.user_id).toBe(userA.id);

      const { error } = await userA.client
        .from("profiles")
        .update({ display_name: "Test User A" })
        .eq("user_id", userA.id);
      expect(error).toBeNull();
    });

    it("user cannot read or write another user's profile", async () => {
      const { data } = await userA.client
        .from("profiles")
        .select("*")
        .eq("user_id", userB.id);
      expect(data).toEqual([]);

      const { error, data: updateData } = await userA.client
        .from("profiles")
        .update({ display_name: "hijacked" })
        .eq("user_id", userB.id)
        .select();
      // RLS silently filters rather than erroring; the assertion is on rows affected.
      expect(error).toBeNull();
      expect(updateData).toEqual([]);
    });

    it("client cannot set has_premium_download_access, even bundled with a legitimate column write; service-role can", async () => {
      const { error } = await userA.client
        .from("profiles")
        .update({ display_name: "Still A", has_premium_download_access: true })
        .eq("user_id", userA.id);
      // Column not in the client's UPDATE grant list -> the whole statement errors.
      expect(error).not.toBeNull();

      const { data: unchanged } = await service
        .from("profiles")
        .select("has_premium_download_access, display_name")
        .eq("user_id", userA.id)
        .single();
      expect(unchanged?.has_premium_download_access).toBe(false);

      // The legitimate column write on its own (no forbidden column) still works.
      const { error: legitError } = await userA.client
        .from("profiles")
        .update({ display_name: "Still A" })
        .eq("user_id", userA.id);
      expect(legitError).toBeNull();

      const { error: serviceError } = await service
        .from("profiles")
        .update({ has_premium_download_access: true })
        .eq("user_id", userA.id);
      expect(serviceError).toBeNull();

      const { data: granted } = await service
        .from("profiles")
        .select("has_premium_download_access")
        .eq("user_id", userA.id)
        .single();
      expect(granted?.has_premium_download_access).toBe(true);
    });
  });

  describe("user_credits", () => {
    it("owner can read their own row, initialized by the onboarding trigger", async () => {
      const { data } = await userA.client
        .from("user_credits")
        .select("*")
        .eq("user_id", userA.id)
        .single();
      expect(data?.user_id).toBe(userA.id);
      expect(typeof data?.credits_remaining).toBe("number");
    });

    it("client cannot update their own credit balance; service-role can", async () => {
      const { error, data } = await userA.client
        .from("user_credits")
        .update({ credits_remaining: 9999 })
        .eq("user_id", userA.id)
        .select();
      expect(error).not.toBeNull();
      expect(data).toBeFalsy();

      const { error: serviceError } = await service
        .from("user_credits")
        .update({ credits_remaining: 42 })
        .eq("user_id", userA.id);
      expect(serviceError).toBeNull();

      const { data: after } = await service
        .from("user_credits")
        .select("credits_remaining")
        .eq("user_id", userA.id)
        .single();
      expect(after?.credits_remaining).toBe(42);
    });

    it("user cannot read another user's credit balance", async () => {
      const { data } = await userA.client
        .from("user_credits")
        .select("*")
        .eq("user_id", userB.id);
      expect(data).toEqual([]);
    });
  });

  describe("resumes", () => {
    it("owner can insert, read, and update their own resume rows", async () => {
      const { data: inserted, error: insertError } = await userA.client
        .from("resumes")
        .insert({ user_id: userA.id, raw_text: "raw", structured_output: { a: 1 } })
        .select()
        .single();
      expect(insertError).toBeNull();
      expect(inserted?.user_id).toBe(userA.id);

      const { error: updateError } = await userA.client
        .from("resumes")
        .update({ raw_text: "updated" })
        .eq("id", inserted!.id);
      expect(updateError).toBeNull();
    });

    it("user cannot read or write another user's resume rows", async () => {
      const { data: bResume } = await service
        .from("resumes")
        .insert({ user_id: userB.id, raw_text: "b's raw text" })
        .select()
        .single();

      const { data: readAttempt } = await userA.client
        .from("resumes")
        .select("*")
        .eq("id", bResume!.id);
      expect(readAttempt).toEqual([]);

      const { data: writeAttempt } = await userA.client
        .from("resumes")
        .update({ raw_text: "hijacked" })
        .eq("id", bResume!.id)
        .select();
      expect(writeAttempt).toEqual([]);
    });
  });

  describe.each([
    { table: "credit_ledger", serviceRow: { amount: 1, reason: "reservation", request_id: "req-1" } },
    {
      table: "analytics_events",
      serviceRow: { request_id: "req-1", event_type: "chat_completion", usage: { tokens: 10 } },
    },
  ] as const)("$table", ({ table, serviceRow }) => {
    it("owner can read own rows (written by service-role); cannot write; cannot read another user's rows", async () => {
      const { data: ownRow, error: serviceInsertError } = await service
        .from(table)
        .insert({ user_id: userA.id, ...serviceRow })
        .select()
        .single();
      expect(serviceInsertError).toBeNull();

      const { data: otherRow } = await service
        .from(table)
        .insert({ user_id: userB.id, ...serviceRow })
        .select()
        .single();

      const { data: ownRead } = await userA.client.from(table).select("*").eq("id", ownRow!.id);
      expect(ownRead).toHaveLength(1);

      const { data: otherRead } = await userA.client
        .from(table)
        .select("*")
        .eq("id", otherRow!.id);
      expect(otherRead).toEqual([]);

      const { error: clientInsertError } = await userA.client
        .from(table)
        .insert({ user_id: userA.id, ...serviceRow });
      expect(clientInsertError).not.toBeNull();
    });
  });
});
