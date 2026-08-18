import { extractText, getDocumentProxy } from "unpdf";

/**
 * Deterministic, non-LLM PDF -> plain text extraction (resume-pdf-upload).
 * The PDF's binary content never leaves this process, let alone reaches the
 * language model.
 */
export interface PdfTextExtractor {
  extract(bytes: Uint8Array): Promise<string>;
}

export class UnpdfTextExtractor implements PdfTextExtractor {
  async extract(bytes: Uint8Array): Promise<string> {
    const pdf = await getDocumentProxy(bytes);
    const { text } = await extractText(pdf, { mergePages: true });
    return text;
  }
}
