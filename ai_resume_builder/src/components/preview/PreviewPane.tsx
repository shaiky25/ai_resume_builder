"use client";

import { useState } from "react";
import type { ResumeDraft } from "@/types/resume";
import { ExportControls } from "./ExportControls";

interface PreviewPaneProps {
  resumeDraft: ResumeDraft;
  isResumeReady: boolean;
}

export function PreviewPane({ resumeDraft, isResumeReady }: PreviewPaneProps) {
  const [manuallyRevealed, setManuallyRevealed] = useState(false);
  const isBlurred = !isResumeReady && !manuallyRevealed;

  return (
    <section className="flex h-full flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <h2 className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
          Resume Preview
        </h2>
        <ExportControls resumeDraft={resumeDraft} disabled={isBlurred} />
      </div>

      <div className="relative flex-1 overflow-y-auto p-6">
        <div
          className={`mx-auto max-w-xl rounded-lg border border-zinc-200 bg-white p-8 shadow-sm transition-[filter] duration-200 dark:border-zinc-800 dark:bg-zinc-950 ${
            isBlurred ? "pointer-events-none blur-md select-none" : ""
          }`}
        >
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            {resumeDraft.name || "Your Name"}
          </h1>
          <p className="mt-1 text-zinc-600 dark:text-zinc-400">
            {resumeDraft.title || "Target Role"}
          </p>
          <p className="mt-4 text-sm leading-6 text-zinc-700 dark:text-zinc-300">
            {resumeDraft.summary || "A short professional summary will appear here."}
          </p>

          {resumeDraft.experience.length > 0 && (
            <div className="mt-6 flex flex-col gap-4">
              {resumeDraft.experience.map((entry, index) => (
                <div key={`${entry.company}-${index}`}>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    {entry.role} · {entry.company}
                  </p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {entry.description}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {isBlurred && (
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              type="button"
              onClick={() => setManuallyRevealed(true)}
              className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-zinc-50 shadow dark:bg-zinc-100 dark:text-zinc-900"
            >
              Reveal preview
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
