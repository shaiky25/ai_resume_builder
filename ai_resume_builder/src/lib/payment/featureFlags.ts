/**
 * Client-readable toggle for the premium-download gate (design.md decision 5:
 * export gating is enforced client-side only). Defaults to enabled — set
 * `NEXT_PUBLIC_PAYMENT_GATE_ENABLED=false` to bypass it (export always
 * allowed, checkout entry point hidden) while no payment provider adapter is
 * registered yet (see `providerRegistry.ts`).
 */
export function isPaymentGateEnabled(): boolean {
  return process.env.NEXT_PUBLIC_PAYMENT_GATE_ENABLED !== "false";
}
