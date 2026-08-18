/**
 * Calls the existing checkout-session-creation endpoint and navigates the
 * browser to the returned checkout destination (checkout-entry-point 5.2).
 */
export async function startCheckout(accessToken: string): Promise<void> {
  const response = await fetch("/api/payments/checkout", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to create checkout session (status ${response.status})`);
  }

  const body = (await response.json()) as { checkoutUrl?: string };
  if (!body.checkoutUrl) {
    throw new Error("Checkout response did not include a checkoutUrl");
  }

  window.location.assign(body.checkoutUrl);
}
