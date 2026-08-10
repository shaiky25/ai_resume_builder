import type { NextRequest } from "next/server";
import { handleChatRequest } from "@/lib/chat/handleChatRequest";

// This route reads runtime env vars, calls out to Supabase/Anthropic, and
// streams a response — it must never be statically prerendered/cached.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<Response> {
  return handleChatRequest(request);
}
