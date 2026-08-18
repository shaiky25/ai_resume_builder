import { describe, expect, it, vi } from "vitest";
import {
  handlePdfUploadRequest,
  type PdfStorageReader,
  type PdfUploadRequestDependencies,
} from "./handlePdfUploadRequest";
import type { PdfTextExtractor } from "./pdfTextExtractor";
import type { ResumeContextGateway, ResumeContext } from "@/lib/chat/resumeContext";
import type { AuthenticatedUser } from "@/lib/supabase/serverClient";
import { PDF_UPLOAD_MAX_BYTES, PDF_EXTRACTED_TEXT_MAX_LENGTH } from "./pdfUploadLimits";

const USER_ID = "user-1";
const VALID_AUTH_HEADER = "Bearer valid-token";

function makeRequest(authHeader: string | null = VALID_AUTH_HEADER): Request {
  const headers: Record<string, string> = {};
  if (authHeader) headers.authorization = authHeader;
  return new Request("http://localhost/api/resume/pdf", { method: "POST", headers });
}

function createFakeStorageReader(blob: Blob | null, error: unknown = null): PdfStorageReader {
  return { download: vi.fn(async () => ({ data: blob, error })) };
}

/**
 * A fake `extract` that never touches an LLM — this route's only text
 * source is deterministic parsing (2.3/4.3). Asserting on `calls` lets
 * tests confirm exactly what bytes reached the extractor.
 */
function createFakeExtractor(
  result: string | Error
): { extractor: PdfTextExtractor; calls: Uint8Array[] } {
  const calls: Uint8Array[] = [];
  const extractor: PdfTextExtractor = {
    extract: vi.fn(async (bytes: Uint8Array) => {
      calls.push(bytes);
      if (result instanceof Error) throw result;
      return result;
    }),
  };
  return { extractor, calls };
}

function createFakeResumeContextGateway(): {
  gateway: ResumeContextGateway;
  persisted: Array<{ userId: string; rawText: string }>;
} {
  const persisted: Array<{ userId: string; rawText: string }> = [];
  const gateway: ResumeContextGateway = {
    getLatestResumeContext: vi.fn(async (): Promise<ResumeContext | null> => null),
    persistStructuredOutput: vi.fn(async () => {}),
    persistRawText: vi.fn(async (userId: string, rawText: string) => {
      persisted.push({ userId, rawText });
    }),
    persistBaselineAssessment: vi.fn(async () => {}),
    persistTailoringStrategy: vi.fn(async () => {}),
    persistSatisfactionSignal: vi.fn(async () => {}),
  };
  return { gateway, persisted };
}

function buildDeps(overrides: Partial<PdfUploadRequestDependencies>): PdfUploadRequestDependencies {
  const { gateway } = createFakeResumeContextGateway();
  const { extractor } = createFakeExtractor("Jane Doe\nSoftware Engineer");
  return {
    verifyUser: async (authHeader: string | null): Promise<AuthenticatedUser | null> =>
      authHeader === VALID_AUTH_HEADER ? { id: USER_ID } : null,
    storageReader: createFakeStorageReader(new Blob(["%PDF"])),
    resumeContextGateway: gateway,
    extractor,
    ...overrides,
  };
}

describe("handlePdfUploadRequest", () => {
  it("rejects an unauthenticated request before touching storage", async () => {
    const storageReader = createFakeStorageReader(new Blob(["%PDF"]));
    const response = await handlePdfUploadRequest(
      makeRequest(null),
      buildDeps({ storageReader })
    );

    expect(response.status).toBe(401);
    expect(storageReader.download).not.toHaveBeenCalled();
  });

  it("derives the storage path from the verified user id, never the request body", async () => {
    const storageReader = createFakeStorageReader(new Blob(["%PDF"]));
    await handlePdfUploadRequest(makeRequest(), buildDeps({ storageReader }));

    expect(storageReader.download).toHaveBeenCalledWith(`${USER_ID}/resume.pdf`);
  });

  it("returns not_found when the user has no uploaded object", async () => {
    const response = await handlePdfUploadRequest(
      makeRequest(),
      buildDeps({ storageReader: createFakeStorageReader(null, new Error("not found")) })
    );

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("not_found");
  });

  it("2.2/4.2: rejects an oversized stored object without attempting to parse it", async () => {
    const oversized = new Blob([new Uint8Array(PDF_UPLOAD_MAX_BYTES + 1)]);
    const { extractor, calls } = createFakeExtractor("should never run");

    const response = await handlePdfUploadRequest(
      makeRequest(),
      buildDeps({ storageReader: createFakeStorageReader(oversized), extractor })
    );

    expect(response.status).toBe(413);
    const body = await response.json();
    expect(body.error).toBe("file_too_large");
    expect(calls).toHaveLength(0);
  });

  it("2.4: surfaces a parser exception as a generic extraction-failed error", async () => {
    const { extractor } = createFakeExtractor(new Error("corrupt pdf"));
    const { gateway, persisted } = createFakeResumeContextGateway();

    const response = await handlePdfUploadRequest(
      makeRequest(),
      buildDeps({ extractor, resumeContextGateway: gateway })
    );

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error).toBe("extraction_failed");
    expect(persisted).toHaveLength(0);
  });

  it("2.5: no-extractable-text yields an error and persists nothing", async () => {
    const { extractor } = createFakeExtractor("   \n\t  ");
    const { gateway, persisted } = createFakeResumeContextGateway();

    const response = await handlePdfUploadRequest(
      makeRequest(),
      buildDeps({ extractor, resumeContextGateway: gateway })
    );

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error).toBe("no_extractable_text");
    expect(persisted).toHaveLength(0);
  });

  it("2.6: text over the length cap is rejected rather than truncated", async () => {
    const { extractor } = createFakeExtractor("a".repeat(PDF_EXTRACTED_TEXT_MAX_LENGTH + 1));
    const { gateway, persisted } = createFakeResumeContextGateway();

    const response = await handlePdfUploadRequest(
      makeRequest(),
      buildDeps({ extractor, resumeContextGateway: gateway })
    );

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error).toBe("extraction_failed");
    expect(persisted).toHaveLength(0);
  });

  it("2.7: persists successfully extracted text scoped to the authenticated user", async () => {
    const { extractor } = createFakeExtractor("  Jane Doe\nSoftware Engineer  ");
    const { gateway, persisted } = createFakeResumeContextGateway();

    const response = await handlePdfUploadRequest(
      makeRequest(),
      buildDeps({ extractor, resumeContextGateway: gateway })
    );

    expect(response.status).toBe(200);
    expect(persisted).toEqual([{ userId: USER_ID, rawText: "Jane Doe\nSoftware Engineer" }]);
  });
});
