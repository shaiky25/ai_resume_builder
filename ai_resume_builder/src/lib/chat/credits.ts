import type { SupabaseClient } from "@supabase/supabase-js";
import { getServiceClient } from "@/lib/supabase/serviceClient";

export interface ReserveResult {
  success: boolean;
  newBalance: number;
}

export interface CreditsGateway {
  /** Reads credits_remaining for the user, or null if no row exists. */
  getCreditsRemaining(userId: string): Promise<number | null>;

  /**
   * Atomically reserves/decrements `cost` credits via the
   * `reserve_chat_credit` RPC (single conditional UPDATE + ledger insert in
   * one Postgres function — see supabase/migrations). success is false if
   * the balance was insufficient at the time of the atomic check (including
   * losing a race against a concurrent reservation), in which case no
   * balance mutation and no ledger row occurred.
   */
  reserve(userId: string, requestId: string, cost: number): Promise<ReserveResult>;

  /**
   * Compensating refund via the `refund_chat_credit` RPC. Best-effort: a
   * failure here is logged, not thrown, so it never masks the original
   * error/response path that triggered the refund.
   */
  refund(
    userId: string,
    requestId: string,
    amount: number,
    reason: string
  ): Promise<void>;
}

interface ReserveRpcRow {
  success: boolean;
  new_balance: number;
}

export class SupabaseCreditsGateway implements CreditsGateway {
  constructor(private readonly client: SupabaseClient = getServiceClient()) {}

  async getCreditsRemaining(userId: string): Promise<number | null> {
    const { data, error } = await this.client
      .from("user_credits")
      .select("credits_remaining")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to read credit balance: ${error.message}`);
    }

    return data ? (data.credits_remaining as number) : null;
  }

  async reserve(userId: string, requestId: string, cost: number): Promise<ReserveResult> {
    const { data, error } = await this.client.rpc("reserve_chat_credit", {
      p_user_id: userId,
      p_request_id: requestId,
      p_cost: cost,
    });

    if (error) {
      throw new Error(`reserve_chat_credit failed: ${error.message}`);
    }

    const row = (Array.isArray(data) ? data[0] : data) as ReserveRpcRow | null;
    return {
      success: Boolean(row?.success),
      newBalance: Number(row?.new_balance ?? 0),
    };
  }

  async refund(
    userId: string,
    requestId: string,
    amount: number,
    reason: string
  ): Promise<void> {
    const { error } = await this.client.rpc("refund_chat_credit", {
      p_user_id: userId,
      p_request_id: requestId,
      p_amount: amount,
      p_reason: reason,
    });

    if (error) {
      // Best-effort/idempotent per design.md's accepted residual risk —
      // log rather than throw so this never masks the original failure.
      console.error("refund_chat_credit failed", error);
    }
  }
}
