import { verifyRequestUser, type AuthenticatedUser } from "@/lib/supabase/serverClient";
import { getServiceClient } from "@/lib/supabase/serviceClient";
import { SupabaseResumeContextGateway, type ResumeContextGateway } from "@/lib/chat/resumeContext";
import { UnpdfTextExtractor, type PdfTextExtractor } from "./pdfTextExtractor";
import { PDF_UPLOAD_MAX_BYTES, PDF_EXTRACTED_TEXT_MAX_LENGTH } from "./pdfUploadLimits";

const BUCKET = "linkedin-pdfs";

/**
 * Narrow read-back of a stored object's bytes, backed by the service-role
 * client in production (this bucket has no client-side SELECT policy — see
 * linkedinPdfStorage.ts, the only other authorized reader). Narrowed to
 * just `download` so tests exercise this route without a real Supabase
 * client, same DI shape as every other gateway in this pipeline.
 */
export interface PdfStorageReader {
  download(path: string): Promise<{ data: Blob | null; error: unknown }>;
}

export function createServiceRoleStorageReader(): PdfStorageReader {
  const client = getServiceClient();
  return {
    download: async (path: string) => {
      const result = await client.storage.from(BUCKET).download(path);
      return { data: result.data, error: result.error };
    },
  };
}

export interface PdfUploadRequestDependencies {
  verifyUser: (authHeader: string | null) => Promise<AuthenticatedUser | null>;
  storageReader: PdfStorageReader;
  resumeContextGateway: ResumeContextGateway;
  extractor: PdfTextExtractor;
}

export function createDefaultDependencies(): PdfUploadRequestDependencies {
  return {
    verifyUser: verifyRequestUser,
    storageReader: createServiceRoleStorageReader(),
    resumeContextGateway: new SupabaseResumeContextGateway(),
    extractor: new UnpdfTextExtractor(),
  };
}

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * POST /api/resume/pdf pipeline (resume-pdf-upload): auth -> read back the
 * caller's own already-uploaded `linkedin-pdfs/${userId}/resume.pdf` object
 * with the service-role client (this bucket has no client-side SELECT
 * policy — see linkedinPdfStorage.ts, the only other authorized reader) ->
 * re-validate its size -> extract text server-side, never sending the PDF's
 * binary/base64 content to the LLM -> persist on success.
 *
 * The object path is always derived from the verified user id, never taken
 * from the request body, so a caller can never trigger extraction against
 * another user's storage path.
 */
export async function handlePdfUploadRequest(
  request: Request,
  deps: PdfUploadRequestDependencies = createDefaultDependencies()
): Promise<Response> {
  const authHeader = request.headers.get("authorization");
  const user = await deps.verifyUser(authHeader);
  if (!user) {
    return jsonResponse(401, { error: "unauthenticated" });
  }

  const path = `${user.id}/resume.pdf`;

  const { data: downloaded, error: downloadError } = await deps.storageReader.download(path);

  if (downloadError || !downloaded) {
    return jsonResponse(404, {
      error: "not_found",
      message: "No uploaded PDF was found. Please upload a resume PDF first.",
    });
  }

  // 2.2: re-validate the stored object's size before parsing, independent
  // of the client-side check the upload UI already performed.
  if (downloaded.size > PDF_UPLOAD_MAX_BYTES) {
    return jsonResponse(413, {
      error: "file_too_large",
      message: `Your uploaded PDF exceeds the ${PDF_UPLOAD_MAX_BYTES / (1024 * 1024)} MB limit.`,
    });
  }

  let text: string;
  try {
    const bytes = new Uint8Array(await downloaded.arrayBuffer());
    text = await deps.extractor.extract(bytes);
  } catch (err) {
    // 2.4: parser exceptions are surfaced as a generic error, never allowed
    // to crash the route.
    console.error("PDF text extraction failed", err);
    return jsonResponse(422, {
      error: "extraction_failed",
      message:
        "We couldn't read that PDF. Please try a different file or paste your resume text manually.",
    });
  }

  const trimmed = text.trim();

  // 2.5: no-extractable-text (e.g. a scanned/image-only PDF) — no persistence.
  if (trimmed.length === 0) {
    return jsonResponse(422, {
      error: "no_extractable_text",
      message:
        "We couldn't find any text in that PDF (it may be a scanned image). Please paste your resume text manually.",
    });
  }

  // 2.6: text over the cap is treated as an extraction failure rather than
  // silently truncated.
  if (trimmed.length > PDF_EXTRACTED_TEXT_MAX_LENGTH) {
    return jsonResponse(422, {
      error: "extraction_failed",
      message: "That PDF's text is too long to process. Please paste your resume text manually.",
    });
  }

  // 2.7: persist, replacing any previous raw text, scoped to this user.
  try {
    await deps.resumeContextGateway.persistRawText(user.id, trimmed);
  } catch (err) {
    console.error("Failed to persist extracted resume text", err);
    return jsonResponse(500, { error: "internal_error" });
  }

  return jsonResponse(200, { success: true });
}
