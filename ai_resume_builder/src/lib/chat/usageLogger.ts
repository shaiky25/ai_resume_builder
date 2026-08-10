import type { SupabaseClient } from "@supabase/supabase-js";
import { getServiceClient } from "@/lib/supabase/serviceClient";

export interface LogSuccessParams {
  userId: string;
  requestId: string;
  inputTokens: number;
  outputTokens: number;
}

export interface UsageLogger {
  /**
   * On stream completion, writes an analytics_events row and a
   * credit_ledger row reflecting ACTUAL usage (chat-usage-logging),
   * regardless of whether it matches the reserved amount. The ledger row
   * here is informational (amount 0) — the flat per-request credit cost was
   * already recorded by the reserve step; this is the actual-usage record
   * for reconciliation/analytics.
   */
  logSuccess(params: LogSuccessParams): Promise<void>;
}

export class SupabaseUsageLogger implements UsageLogger {
  constructor(private readonly client: SupabaseClient = getServiceClient()) {}

  async logSuccess(params: LogSuccessParams): Promise<void> {
    const { userId, requestId, inputTokens, outputTokens } = params;

    const [analyticsResult, ledgerResult] = await Promise.all([
      this.client.from("analytics_events").insert({
        user_id: userId,
        request_id: requestId,
        event_type: "chat_completion",
        usage: { input_tokens: inputTokens, output_tokens: outputTokens },
      }),
      this.client.from("credit_ledger").insert({
        user_id: userId,
        amount: 0,
        reason: "usage_actual",
        request_id: requestId,
      }),
    ]);

    if (analyticsResult.error) {
      console.error("Failed to write analytics_events row", analyticsResult.error);
    }
    if (ledgerResult.error) {
      console.error("Failed to write actual-usage credit_ledger row", ledgerResult.error);
    }
  }
}
