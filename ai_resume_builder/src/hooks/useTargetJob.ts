"use client";

import { useEffect, useState } from "react";
import { getBrowserClient } from "@/lib/supabase/browserClient";
import type { TargetJob } from "@/types/resume";

interface TargetJobRow {
  target_job_title: string | null;
  target_job_company: string | null;
  target_job_description: string | null;
}

function toTargetJob(row: TargetJobRow | null | undefined): TargetJob | null {
  if (!row || !row.target_job_title || !row.target_job_description) {
    return null;
  }
  return {
    title: row.target_job_title,
    company: row.target_job_company ?? "",
    description: row.target_job_description,
  };
}

export interface UseTargetJobResult {
  targetJob: TargetJob | null;
  isSubmitting: boolean;
  submitTargetJob: (input: TargetJob) => Promise<void>;
}

/**
 * Reads and persists the authenticated user's target job (job-target-input),
 * subscribed via Supabase Realtime on the same `app.resumes` row/pattern as
 * `useResumeDraft`. Submitting a new target job replaces the previous one
 * and resets the derived baseline/tailoring/satisfaction state on that row,
 * since those are only valid for the target job they were derived against
 * (design.md: baseline-before-rewrite sequencing).
 */
export function useTargetJob(userId: string | null): UseTargetJobResult {
  const [targetJob, setTargetJob] = useState<TargetJob | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!userId) {
      setTargetJob(null);
      return;
    }

    const supabase = getBrowserClient();
    let cancelled = false;

    const applyRow = (row: TargetJobRow | null | undefined) => {
      if (cancelled) return;
      setTargetJob(toTargetJob(row));
    };

    supabase
      .schema("app")
      .from("resumes")
      .select("target_job_title, target_job_company, target_job_description")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => applyRow(data as TargetJobRow | null));

    const channel = supabase
      .channel(`resumes-target-job:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "app",
          table: "resumes",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => applyRow(payload.new as TargetJobRow)
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const submitTargetJob = async (input: TargetJob) => {
    if (!userId) return;
    setIsSubmitting(true);
    try {
      const supabase = getBrowserClient();

      const { data: existing, error: selectError } = await supabase
        .schema("app")
        .from("resumes")
        .select("id")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (selectError) {
        throw new Error(`Failed to look up existing resume row: ${selectError.message}`);
      }

      // Replacing the target job invalidates any previously derived
      // baseline/tailoring strategy and satisfaction signal — they were
      // computed against the old target job (2.2, design.md).
      const payload = {
        target_job_title: input.title,
        target_job_company: input.company || null,
        target_job_description: input.description,
        baseline_assessment: null,
        tailoring_strategy: null,
        optimization_satisfied: false,
        export_requested: false,
        updated_at: new Date().toISOString(),
      };

      if (existing) {
        const { error } = await supabase
          .schema("app")
          .from("resumes")
          .update(payload)
          .eq("id", existing.id as string)
          .eq("user_id", userId);

        if (error) {
          throw new Error(`Failed to update target job: ${error.message}`);
        }
      } else {
        const { error } = await supabase
          .schema("app")
          .from("resumes")
          .insert({ user_id: userId, ...payload });

        if (error) {
          throw new Error(`Failed to insert target job: ${error.message}`);
        }
      }

      setTargetJob(input);
    } finally {
      setIsSubmitting(false);
    }
  };

  return { targetJob, isSubmitting, submitTargetJob };
}
