import type { NextRequest } from "next/server";
import { handleCreateCheckoutSessionRequest } from "@/lib/payment/createCheckoutSession";

// Reads runtime env vars and calls out to the configured payment provider —
// must never be statically prerendered/cached.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<Response> {
  return handleCreateCheckoutSessionRequest(request);
}
