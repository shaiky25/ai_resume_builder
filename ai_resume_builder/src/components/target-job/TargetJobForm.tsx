"use client";

import { useState, type FormEvent } from "react";
import type { TargetJob } from "@/types/resume";

interface TargetJobFormProps {
  targetJob: TargetJob | null;
  isSubmitting: boolean;
  onSubmit: (input: TargetJob) => Promise<void>;
}

/**
 * UI surface for the user to submit/update the target job (job-target-input
 * 2.1/2.2) that anchors the resume session. Collapsed to a summary once a
 * target job is set, expandable to edit/replace it.
 */
export function TargetJobForm({ targetJob, isSubmitting, onSubmit }: TargetJobFormProps) {
  const [isEditing, setIsEditing] = useState(!targetJob);
  const [title, setTitle] = useState(targetJob?.title ?? "");
  const [company, setCompany] = useState(targetJob?.company ?? "");
  const [description, setDescription] = useState(targetJob?.description ?? "");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    if (!trimmedTitle || !trimmedDescription) return;

    await onSubmit({
      title: trimmedTitle,
      company: company.trim(),
      description: trimmedDescription,
    });
    setIsEditing(false);
  };

  if (!isEditing && targetJob) {
    return (
      <div className="flex items-center justify-between gap-3 border-b border-zinc-200 bg-zinc-50 px-4 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900">
        <span className="truncate text-zinc-700 dark:text-zinc-300">
          Targeting <span className="font-medium text-zinc-900 dark:text-zinc-50">{targetJob.title}</span>
          {targetJob.company ? ` at ${targetJob.company}` : ""}
        </span>
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="shrink-0 rounded-full border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          Change target job
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800"
    >
      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
        What job are you targeting?
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Job title"
          className="flex-1 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-900 outline-none dark:border-zinc-700 dark:text-zinc-50"
        />
        <input
          type="text"
          value={company}
          onChange={(event) => setCompany(event.target.value)}
          placeholder="Company (optional)"
          className="flex-1 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-900 outline-none dark:border-zinc-700 dark:text-zinc-50"
        />
      </div>
      <textarea
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        placeholder="Paste the full job description…"
        rows={4}
        className="resize-none rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none dark:border-zinc-700 dark:text-zinc-50"
      />
      <div className="flex justify-end gap-2">
        {targetJob && (
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting || !title.trim() || !description.trim()}
          className="rounded-full bg-zinc-900 px-4 py-1.5 text-xs font-medium text-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {isSubmitting ? "Saving…" : "Save target job"}
        </button>
      </div>
    </form>
  );
}
