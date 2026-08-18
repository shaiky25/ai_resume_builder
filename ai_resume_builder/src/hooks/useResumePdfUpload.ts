"use client";

import { useCallback, useState } from "react";
import { getBrowserClient } from "@/lib/supabase/browserClient";
import { PDF_UPLOAD_MAX_BYTES } from "@/lib/resume/pdfUploadLimits";

const BUCKET = "linkedin-pdfs";

export type ResumePdfUploadStatus = "idle" | "uploading" | "extracting" | "success" | "error";

interface PdfUploadErrorBody {
  error?: string;
  message?: string;
}

export interface UseResumePdfUploadResult {
  status: ResumePdfUploadStatus;
  errorMessage: string | null;
  uploadResumePdf: (file: File) => Promise<void>;
  reset: () => void;
}

/**
 * Drives the resume-pdf-upload flow end to end: client-side size check ->
 * direct-to-Storage upload (owner-scoped path, overwriting any previous
 * object) -> trigger server-side extraction/persistence via `/api/resume/pdf`.
 * Mirrors the DI-free, straightforward hook shape of `useTargetJob`.
 */
export function useResumePdfUpload(
  userId: string | null,
  accessToken: string | undefined
): UseResumePdfUploadResult {
  const [status, setStatus] = useState<ResumePdfUploadStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const reset = useCallback(() => {
    setStatus("idle");
    setErrorMessage(null);
  }, []);

  const uploadResumePdf = useCallback(
    async (file: File) => {
      if (!userId || !accessToken) return;

      // 3.2: client-side size check before the upload starts.
      if (file.size > PDF_UPLOAD_MAX_BYTES) {
        setStatus("error");
        setErrorMessage(
          `That file is over the ${PDF_UPLOAD_MAX_BYTES / (1024 * 1024)} MB limit. Please choose a smaller PDF.`
        );
        return;
      }

      setStatus("uploading");
      setErrorMessage(null);

      // 3.3: upload directly to the owner-scoped path, overwriting any
      // previous object (fixed filename, per design.md).
      const supabase = getBrowserClient();
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(`${userId}/resume.pdf`, file, {
          upsert: true,
          contentType: "application/pdf",
        });

      if (uploadError) {
        setStatus("error");
        setErrorMessage("Upload failed. Please try again.");
        return;
      }

      // 3.4: trigger server-side extraction + persistence.
      setStatus("extracting");
      try {
        const response = await fetch("/api/resume/pdf", {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!response.ok) {
          let body: PdfUploadErrorBody | null = null;
          try {
            body = (await response.json()) as PdfUploadErrorBody;
          } catch {
            // Non-JSON error body — fall through to the generic message.
          }
          setStatus("error");
          setErrorMessage(
            body?.message ??
              "We couldn't process that PDF. Please try again or paste your resume text manually."
          );
          return;
        }

        setStatus("success");
      } catch {
        setStatus("error");
        setErrorMessage("Could not reach the server. Please try again.");
      }
    },
    [userId, accessToken]
  );

  return { status, errorMessage, uploadResumePdf, reset };
}
