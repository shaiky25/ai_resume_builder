"use client";

import { useEffect, useState } from "react";
import { getBrowserClient } from "@/lib/supabase/browserClient";
import { emptyResumeDraft, type ResumeDraft } from "@/types/resume";

interface ResumeRow {
  structured_output: unknown;
}

function toResumeDraft(structuredOutput: unknown): ResumeDraft {
  if (!structuredOutput || typeof structuredOutput !== "object") {
    return emptyResumeDraft;
  }
  const candidate = structuredOutput as Partial<ResumeDraft>;
  return {
    name: typeof candidate.name === "string" ? candidate.name : "",
    title: typeof candidate.title === "string" ? candidate.title : "",
    summary: typeof candidate.summary === "string" ? candidate.summary : "",
    experience: Array.isArray(candidate.experience) ? candidate.experience : [],
  };
}

/** "Usable shape" per design.md decision 4: a name plus at least one experience entry. */
function isUsableResumeDraft(draft: ResumeDraft): boolean {
  return draft.name.trim().length > 0 && draft.experience.length > 0;
}

export interface UseResumeDraftResult {
  resumeDraft: ResumeDraft;
  isResumeReady: boolean;
}

/**
 * Subscribes to the authenticated user's `resumes` row via Supabase
 * Realtime (same `postgres_changes` pattern as
 * `/payment/processing/page.tsx`), plus an initial fetch on mount, so the
 * live preview reflects `structured_output` as soon as a chat turn's
 * extraction step persists it — no polling, no page reload
 * (resume-structured-extraction, chat-live-integration tasks 3.1-3.3).
 */
export function useResumeDraft(userId: string | null): UseResumeDraftResult {
  const [resumeDraft, setResumeDraft] = useState<ResumeDraft>(emptyResumeDraft);

  // Reset during render (not in an effect) when the user changes, per
  // https://react.dev/learn/you-might-not-need-an-effect — avoids the
  // extra render+commit+effect round trip a `useEffect` reset would cost.
  const [trackedUserId, setTrackedUserId] = useState(userId);
  if (userId !== trackedUserId) {
    setTrackedUserId(userId);
    setResumeDraft(emptyResumeDraft);
  }

  useEffect(() => {
    if (!userId) {
      return;
    }

    const supabase = getBrowserClient();
    let cancelled = false;

    const applyRow = (row: ResumeRow | null | undefined) => {
      if (cancelled) return;
      setResumeDraft(toResumeDraft(row?.structured_output ?? null));
    };

    supabase
      .schema("app")
      .from("resumes")
      .select("structured_output")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => applyRow(data as ResumeRow | null));

    const channel = supabase
      .channel(`resumes:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "app",
          table: "resumes",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => applyRow(payload.new as ResumeRow)
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { resumeDraft, isResumeReady: isUsableResumeDraft(resumeDraft) };
}
