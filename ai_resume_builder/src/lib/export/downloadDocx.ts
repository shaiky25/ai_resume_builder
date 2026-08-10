import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import type { ResumeDraft } from "@/types/resume";
import { triggerBlobDownload } from "./triggerBlobDownload";

function buildDocument(resumeDraft: ResumeDraft): Document {
  const experienceParagraphs = resumeDraft.experience.flatMap((entry) => [
    new Paragraph({
      children: [
        new TextRun({ text: `${entry.role} · ${entry.company}`, bold: true }),
      ],
      spacing: { before: 200 },
    }),
    new Paragraph({ text: entry.description }),
  ]);

  return new Document({
    sections: [
      {
        children: [
          new Paragraph({
            text: resumeDraft.name || "Your Name",
            heading: HeadingLevel.TITLE,
          }),
          new Paragraph({ text: resumeDraft.title || "Target Role" }),
          new Paragraph({ text: resumeDraft.summary, spacing: { before: 200 } }),
          ...experienceParagraphs,
        ],
      },
    ],
  });
}

/**
 * Compiles the resume to DOCX entirely in-browser and triggers a client-side
 * download. No network request is made — the `docx` library builds the
 * .docx bytes locally and Packer.toBlob() hands us the resulting Blob.
 */
export async function downloadResumeDocx(resumeDraft: ResumeDraft) {
  const blob = await Packer.toBlob(buildDocument(resumeDraft));
  const fileName = `${resumeDraft.name || "resume"}.docx`.trim().replace(/\s+/g, "_");
  triggerBlobDownload(blob, fileName);
}
