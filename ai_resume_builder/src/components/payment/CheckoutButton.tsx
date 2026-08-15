"use client";

import { useState } from "react";
import { startCheckout } from "@/lib/payment/startCheckout";

interface CheckoutButtonProps {
  accessToken: string;
}

/**
 * Checkout entry point (checkout-entry-point 5.1/5.2). The parent is
 * responsible for only rendering this when `has_premium_download_access` is
 * false (5.1) and for hiding it once that flag flips true (5.3) — this
 * component itself has no visibility logic.
 */
export function CheckoutButton({ accessToken }: CheckoutButtonProps) {
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setIsStarting(true);
    setError(null);
    try {
      await startCheckout(accessToken);
    } catch (err) {
      console.error("Failed to start checkout", err);
      setError("Couldn't start checkout. Please try again.");
      setIsStarting(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-red-600 dark:text-red-400">{error}</span>}
      <button
        type="button"
        onClick={handleClick}
        disabled={isStarting}
        className="rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isStarting ? "Redirecting…" : "Unlock downloads"}
      </button>
    </div>
  );
}
