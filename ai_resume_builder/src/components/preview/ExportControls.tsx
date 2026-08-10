"use client";

import { useState } from "react";
import type { ResumeDraft } from "@/types/resume";
import { downloadResumePdf } from "@/lib/export/downloadPdf";
import { downloadResumeDocx } from "@/lib/export/downloadDocx";

interface ExportControlsProps {
  resumeDraft: ResumeDraft;
  disabled: boolean;
}

export function ExportControls({ resumeDraft, disabled }: ExportControlsProps) {
  const [isExporting, setIsExporting] = useState<"pdf" | "docx" | null>(null);

  const handleExport = async (format: "pdf" | "docx") => {
    setIsExporting(format);
    try {
      if (format === "pdf") {
        await downloadResumePdf(resumeDraft);
      } else {
        await downloadResumeDocx(resumeDraft);
      }
    } finally {
      setIsExporting(null);
    }
  };

  const buttonDisabled = disabled || isExporting !== null;

  return (
    <div className="flex gap-2">
      <button
        type="button"
        disabled={buttonDisabled}
        onClick={() => handleExport("pdf")}
        className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200"
      >
        {isExporting === "pdf" ? "Exporting…" : "Export PDF"}
      </button>
      <button
        type="button"
        disabled={buttonDisabled}
        onClick={() => handleExport("docx")}
        className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200"
      >
        {isExporting === "docx" ? "Exporting…" : "Export DOCX"}
      </button>
    </div>
  );
}
