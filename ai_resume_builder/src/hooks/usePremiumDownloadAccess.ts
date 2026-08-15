"use client";

import { useEffect, useState } from "react";
import { getBrowserClient } from "@/lib/supabase/browserClient";
import { isPaymentGateEnabled } from "@/lib/payment/featureFlags";

interface ProfileRow {
  has_premium_download_access: boolean;
}

/**
 * Subscribes to the authenticated user's `profiles` row via Supabase
 * Realtime, plus an initial fetch on mount, so `premium-download-gate` and
 * `checkout-entry-point` reflect a payment-driven access change live,
 * without a page reload (task 4.1).
 *
 * When `NEXT_PUBLIC_PAYMENT_GATE_ENABLED=false`, the gate is bypassed
 * entirely (export always allowed, checkout entry point hidden) — no
 * payment provider adapter is implemented yet, so this lets export be
 * exercised/tested ahead of that work.
 */
export function usePremiumDownloadAccess(userId: string | null): boolean {
  const [hasPremiumDownloadAccess, setHasPremiumDownloadAccess] = useState(false);
  const gateEnabled = isPaymentGateEnabled();

  useEffect(() => {
    if (!gateEnabled) return;
    if (!userId) {
      setHasPremiumDownloadAccess(false);
      return;
    }

    const supabase = getBrowserClient();
    let cancelled = false;

    const applyRow = (row: ProfileRow | null | undefined) => {
      if (cancelled) return;
      setHasPremiumDownloadAccess(Boolean(row?.has_premium_download_access));
    };

    supabase
      .schema("app")
      .from("profiles")
      .select("has_premium_download_access")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => applyRow(data as ProfileRow | null));

    const channel = supabase
      .channel(`profiles:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "app",
          table: "profiles",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => applyRow(payload.new as ProfileRow)
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userId, gateEnabled]);

  return gateEnabled ? hasPremiumDownloadAccess : true;
}
