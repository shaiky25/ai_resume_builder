import type { NextRequest } from "next/server";
import { handlePdfUploadRequest } from "@/lib/resume/handlePdfUploadRequest";

// Reads the caller's uploaded PDF from Storage and parses it with unpdf —
// needs full Node APIs, same convention as /api/chat.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<Response> {
  return handlePdfUploadRequest(request);
}
