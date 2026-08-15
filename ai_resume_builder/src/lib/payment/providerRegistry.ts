import type { PaymentProviderAdapter } from "./types";

/**
 * The single configuration point (design.md decision) that determines the
 * active payment provider. Concrete adapters register themselves here (by
 * name) at module load; which one is active is decided purely by the
 * `PAYMENT_PROVIDER` env var — no provider-specific branching lives outside
 * whatever module registers under that name.
 */
type PaymentProviderFactory = () => PaymentProviderAdapter;

const registry = new Map<string, PaymentProviderFactory>();

export function registerPaymentProviderAdapter(name: string, factory: PaymentProviderFactory): void {
  registry.set(name, factory);
}

/** Test-only: clears all registered adapters so suites don't leak state across each other. */
export function resetPaymentProviderRegistry(): void {
  registry.clear();
}

export class PaymentProviderConfigError extends Error {}

/**
 * Resolves the active adapter from `PAYMENT_PROVIDER`. Throws
 * PaymentProviderConfigError (never silently falls back to a default) if
 * the env var is unset or names a provider with no registered adapter —
 * checkout/webhook code should let this surface as a 500 rather than guess.
 */
export function getConfiguredPaymentProvider(): PaymentProviderAdapter {
  const providerName = process.env.PAYMENT_PROVIDER;

  if (!providerName) {
    throw new PaymentProviderConfigError(
      "PAYMENT_PROVIDER env var must be set to a registered payment provider"
    );
  }

  const factory = registry.get(providerName);
  if (!factory) {
    throw new PaymentProviderConfigError(
      `No payment provider adapter registered for PAYMENT_PROVIDER="${providerName}"`
    );
  }

  return factory();
}
