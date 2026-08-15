import type { SupabaseClient } from "@supabase/supabase-js";
import { getServiceClient } from "@/lib/supabase/serviceClient";
import type { PaymentEventStatus } from "./types";

export interface RecordResultResult {
  /** False if this (provider, providerSessionId) had already left 'pending' — a safe no-op retry. */
  processed: boolean;
  userId: string | null;
}

export interface PaymentTransactionsGateway {
  /** Inserts the pending row created alongside the checkout session, before redirecting the client. */
  createPending(params: {
    userId: string;
    provider: string;
    providerSessionId: string;
  }): Promise<void>;

  /**
   * Idempotently transitions the session to its verified outcome via the
   * `record_payment_result` RPC (single atomic statement — see migration),
   * granting `has_premium_download_access` on success. Safe to call more
   * than once for the same (provider, providerSessionId); only the first
   * call has any effect.
   */
  recordResult(params: {
    provider: string;
    providerSessionId: string;
    status: PaymentEventStatus;
    providerTransactionId: string;
    amountCents: number | null;
  }): Promise<RecordResultResult>;
}

interface RecordResultRpcRow {
  processed: boolean;
  user_id: string | null;
}

export class SupabasePaymentTransactionsGateway implements PaymentTransactionsGateway {
  constructor(private readonly client: SupabaseClient = getServiceClient()) {}

  async createPending(params: {
    userId: string;
    provider: string;
    providerSessionId: string;
  }): Promise<void> {
    const { error } = await this.client.from("payment_transactions").insert({
      user_id: params.userId,
      provider: params.provider,
      provider_session_id: params.providerSessionId,
      status: "pending",
    });

    if (error) {
      throw new Error(`Failed to record pending checkout session: ${error.message}`);
    }
  }

  async recordResult(params: {
    provider: string;
    providerSessionId: string;
    status: PaymentEventStatus;
    providerTransactionId: string;
    amountCents: number | null;
  }): Promise<RecordResultResult> {
    const { data, error } = await this.client.rpc("record_payment_result", {
      p_provider: params.provider,
      p_provider_session_id: params.providerSessionId,
      p_status: params.status,
      p_provider_transaction_id: params.providerTransactionId,
      p_amount_cents: params.amountCents,
    });

    if (error) {
      throw new Error(`record_payment_result failed: ${error.message}`);
    }

    const row = (Array.isArray(data) ? data[0] : data) as RecordResultRpcRow | null;
    return {
      processed: Boolean(row?.processed),
      userId: row?.user_id ?? null,
    };
  }
}
