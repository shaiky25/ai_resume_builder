import { afterEach, describe, expect, it, vi } from "vitest";
import {
  PaymentProviderConfigError,
  getConfiguredPaymentProvider,
  registerPaymentProviderAdapter,
  resetPaymentProviderRegistry,
} from "./providerRegistry";
import type { PaymentProviderAdapter } from "./types";

function fakeAdapter(name: string): PaymentProviderAdapter {
  return {
    name,
    createCheckoutSession: vi.fn(),
    verifyAndParseEvent: vi.fn(),
  };
}

describe("providerRegistry", () => {
  const originalEnv = process.env.PAYMENT_PROVIDER;

  afterEach(() => {
    resetPaymentProviderRegistry();
    process.env.PAYMENT_PROVIDER = originalEnv;
  });

  it("throws a config error when PAYMENT_PROVIDER is unset", () => {
    delete process.env.PAYMENT_PROVIDER;
    expect(() => getConfiguredPaymentProvider()).toThrow(PaymentProviderConfigError);
  });

  it("throws a config error when PAYMENT_PROVIDER names an unregistered provider", () => {
    process.env.PAYMENT_PROVIDER = "unregistered-provider";
    expect(() => getConfiguredPaymentProvider()).toThrow(PaymentProviderConfigError);
  });

  // 5.5 — switching PAYMENT_PROVIDER requires no changes to any calling
  // code: the same getConfiguredPaymentProvider() call resolves whichever
  // adapter is currently registered under the configured name.
  it("resolves the adapter matching whichever provider is currently configured", () => {
    const providerA = fakeAdapter("provider-a");
    const providerB = fakeAdapter("provider-b");
    registerPaymentProviderAdapter("provider-a", () => providerA);
    registerPaymentProviderAdapter("provider-b", () => providerB);

    process.env.PAYMENT_PROVIDER = "provider-a";
    expect(getConfiguredPaymentProvider()).toBe(providerA);

    process.env.PAYMENT_PROVIDER = "provider-b";
    expect(getConfiguredPaymentProvider()).toBe(providerB);
  });
});
