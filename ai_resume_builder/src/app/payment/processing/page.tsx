"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthSession } from "@/components/auth/AuthProvider";
import { getBrowserClient } from "@/lib/supabase/browserClient";

type ProcessingState = "processing" | "succeeded" | "failed" | "missing_session";

interface PaymentTransactionRow {
  status: "pending" | "succeeded" | "failed";
}

/**
 * Post-checkout redirect landing page (checkout-processing-state). The
 * redirect back from the provider is NOT trusted as proof of payment — this
 * page only ever reflects the payment_transactions row's status, which the
 * webhook handler is the sole writer of, and stays in "processing" until
 * that verified server-side transition happens.
 */
export default function PaymentProcessingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuthSession();

  const provider = searchParams.get("provider");
  const sessionId = searchParams.get("session_id");

  const [state, setState] = useState<ProcessingState>(
    provider && sessionId ? "processing" : "missing_session"
  );

  useEffect(() => {
    if (!user || !provider || !sessionId) return;

    const supabase = getBrowserClient();
    let cancelled = false;

    const applyRow = (row: PaymentTransactionRow | null) => {
      if (cancelled || !row) return;
      if (row.status === "succeeded") setState("succeeded");
      else if (row.status === "failed") setState("failed");
      else setState("processing");
    };

    supabase
      .schema("app")
      .from("payment_transactions")
      .select("status")
      .eq("provider", provider)
      .eq("provider_session_id", sessionId)
      .maybeSingle()
      .then(({ data }) => applyRow(data as PaymentTransactionRow | null));

    const channel = supabase
      .channel(`payment_transactions:${provider}:${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "app",
          table: "payment_transactions",
          filter: `provider_session_id=eq.${sessionId}`,
        },
        (payload) => applyRow(payload.new as PaymentTransactionRow)
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user, provider, sessionId]);

  if (authLoading) {
    return <div className="flex flex-1" />;
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      {state === "processing" && (
        <>
          <div
            aria-hidden="true"
            className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100"
          />
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Confirming your payment&hellip;
          </p>
        </>
      )}

      {state === "succeeded" && (
        <>
          <p className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
            Payment confirmed
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Premium downloads are now unlocked on your account.
          </p>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            Continue
          </button>
        </>
      )}

      {state === "failed" && (
        <>
          <p className="text-lg font-medium text-zinc-900 dark:text-zinc-50">Payment failed</p>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Your payment wasn&apos;t completed and no access was granted. You can try again.
          </p>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="rounded-full border border-zinc-300 px-4 py-2 text-sm text-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
          >
            Back home
          </button>
        </>
      )}

      {state === "missing_session" && (
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          No checkout session found. Please start your purchase again.
        </p>
      )}
    </div>
  );
}
