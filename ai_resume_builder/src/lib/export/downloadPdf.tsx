import { pdf } from "@react-pdf/renderer";
import type { ResumeDraft } from "@/types/resume";
import { ResumePdfDocument } from "./pdfDocument";
import { triggerBlobDownload } from "./triggerBlobDownload";

/**
 * Compiles the resume to PDF entirely in-browser and triggers a client-side
 * download. No network request is made — @react-pdf/renderer renders the PDF
 * bytes locally and we hand the resulting Blob straight to the browser.
 */
export async function downloadResumePdf(resumeDraft: ResumeDraft) {
  const blob = await pdf(<ResumePdfDocument resumeDraft={resumeDraft} />).toBlob();
  const fileName = `${resumeDraft.name || "resume"}.pdf`.trim().replace(/\s+/g, "_");
  triggerBlobDownload(blob, fileName);
}
