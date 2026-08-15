import type { NextRequest } from "next/server";
import { handleWebhookRequest } from "@/lib/payment/handleWebhookRequest";

// Signature verification needs the raw request body and reads runtime env
// vars — must never be statically prerendered/cached.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<Response> {
  return handleWebhookRequest(request);
}
