import type { SupabaseClient } from "@supabase/supabase-js";
import { getServiceClient } from "@/lib/supabase/serviceClient";

const BUCKET = "linkedin-pdfs";

/**
 * Server-side-only signed URL generation for a user's own LinkedIn PDF.
 * Uses the service-role client (bypasses RLS/storage policies), which is
 * required because the bucket has no client-side SELECT policy — this is
 * the sole authorized read path per linkedin-pdf-storage's spec.
 *
 * `path` must already be scoped under the caller's own `userId` (e.g.
 * `${userId}/resume.pdf`); callers are responsible for verifying the
 * requesting user owns `path` before calling this.
 */
export async function createLinkedinPdfSignedUrl(
  path: string,
  expiresInSeconds: number,
  client: SupabaseClient = getServiceClient()
): Promise<string> {
  const { data, error } = await client.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresInSeconds);

  if (error || !data?.signedUrl) {
    throw new Error(
      `Failed to create signed URL for ${path}: ${error?.message ?? "unknown error"}`
    );
  }

  return data.signedUrl;
}
