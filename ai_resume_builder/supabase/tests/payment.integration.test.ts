import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createTestUser,
  deleteTestUser,
  getServiceClient,
  hasLiveSupabaseEnv,
  type TestUser,
} from "./testHelpers";

// Covers payment-gatekeeping tasks 5.1, 5.2, 5.4 against a live Supabase
// project (the RPC-level atomicity these rely on can't be honestly modeled
// by an in-memory fake the way src/lib/payment/handleWebhookRequest.test.ts
// does at the pipeline layer). Requires SUPABASE_URL, SUPABASE_ANON_KEY,
// SUPABASE_SERVICE_ROLE_KEY — see README.md. Inert otherwise.
describe.skipIf(!hasLiveSupabaseEnv)("payment_transactions / record_payment_result", () => {
  let service: SupabaseClient;
  let user: TestUser;

  beforeAll(async () => {
    service = getServiceClient();
    user = await createTestUser(service);
  });

  afterAll(async () => {
    if (user) await deleteTestUser(service, user.id);
  });

  async function insertPending(providerSessionId: string) {
    const { error } = await service.from("payment_transactions").insert({
      user_id: user.id,
      provider: "test-provider",
      provider_session_id: providerSessionId,
      status: "pending",
    });
    expect(error).toBeNull();
  }

  // 5.2 — duplicate delivery of the same succeeded event does not
  // double-grant or double-log; only the first call transitions the row.
  it("only the first record_payment_result call for a session grants access and updates the row", async () => {
    const sessionId = `sess-dup-${Date.now()}`;
    await insertPending(sessionId);

    const first = await service.rpc("record_payment_result", {
      p_provider: "test-provider",
      p_provider_session_id: sessionId,
      p_status: "succeeded",
      p_provider_transaction_id: "txn-1",
      p_amount_cents: 199,
    });
    const second = await service.rpc("record_payment_result", {
      p_provider: "test-provider",
      p_provider_session_id: sessionId,
      p_status: "succeeded",
      p_provider_transaction_id: "txn-1",
      p_amount_cents: 199,
    });

    expect(first.error).toBeNull();
    expect(first.data?.[0]?.processed).toBe(true);
    expect(second.error).toBeNull();
    expect(second.data?.[0]?.processed).toBe(false);

    const { data: profile } = await service
      .from("profiles")
      .select("has_premium_download_access")
      .eq("user_id", user.id)
      .single();
    expect(profile?.has_premium_download_access).toBe(true);

    const { data: rows } = await service
      .from("payment_transactions")
      .select("status")
      .eq("provider", "test-provider")
      .eq("provider_session_id", sessionId);
    expect(rows).toHaveLength(1);
    expect(rows?.[0]?.status).toBe("succeeded");
  });

  // 5.1 / 5.4 — a "failed" outcome (standing in for a session no client
  // ever redirected through, or one that never gets a verified success)
  // never grants access.
  it("a failed outcome grants no access", async () => {
    const sessionId = `sess-fail-${Date.now()}`;
    await insertPending(sessionId);

    const { error, data } = await service.rpc("record_payment_result", {
      p_provider: "test-provider",
      p_provider_session_id: sessionId,
      p_status: "failed",
      p_provider_transaction_id: "txn-2",
      p_amount_cents: null,
    });

    expect(error).toBeNull();
    expect(data?.[0]?.processed).toBe(true);

    const { data: profile } = await service
      .from("profiles")
      .select("has_premium_download_access")
      .eq("user_id", user.id)
      .single();
    expect(profile?.has_premium_download_access).toBe(false);
  });

  // 5.4 — an unknown/never-created session id (i.e. no verified webhook
  // ever arrived for it) matches no pending row and grants nothing.
  it("an unrecognized session id is a safe no-op", async () => {
    const { error, data } = await service.rpc("record_payment_result", {
      p_provider: "test-provider",
      p_provider_session_id: `sess-unknown-${Date.now()}`,
      p_status: "succeeded",
      p_provider_transaction_id: "txn-3",
      p_amount_cents: 199,
    });

    expect(error).toBeNull();
    expect(data?.[0]?.processed).toBe(false);
    expect(data?.[0]?.user_id).toBeNull();
  });

  it("the owning client can read their own transaction row via RLS, service_role writes only", async () => {
    const sessionId = `sess-rls-${Date.now()}`;
    await insertPending(sessionId);

    const { data, error } = await user.client
      .from("payment_transactions")
      .select("status")
      .eq("provider_session_id", sessionId)
      .single();

    expect(error).toBeNull();
    expect(data?.status).toBe("pending");

    const { error: writeError } = await user.client
      .from("payment_transactions")
      .update({ status: "succeeded" })
      .eq("provider_session_id", sessionId);
    expect(writeError).not.toBeNull();
  });
});
