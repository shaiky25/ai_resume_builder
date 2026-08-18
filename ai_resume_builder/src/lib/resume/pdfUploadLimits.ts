/**
 * Shared upload/extraction bounds for resume-pdf-upload, imported by both
 * the client-side file-size check and the server-side re-validation/length
 * cap so the two enforcement points can never drift apart.
 */
export const PDF_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;

/**
 * Text over this length is treated as an extraction failure rather than
 * truncated (design.md decision) — comfortably larger than any real resume,
 * small enough to bound downstream prompt-injection token cost.
 */
export const PDF_EXTRACTED_TEXT_MAX_LENGTH = 50_000;
