"use client";

import { useEffect, useState } from "react";
import { getBrowserClient } from "@/lib/supabase/browserClient";
import type { BaselineAssessment, TailoringStrategy } from "@/types/resume";

interface TailoringInsightsRow {
  target_job_title: string | null;
  baseline_assessment: unknown;
  tailoring_strategy: unknown;
  optimization_satisfied: boolean | null;
  export_requested: boolean | null;
}

function toBaselineAssessment(value: unknown): BaselineAssessment | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<BaselineAssessment>;
  if (typeof candidate.matchScore !== "number") return null;
  return {
    matchScore: candidate.matchScore,
    missingKeywords: Array.isArray(candidate.missingKeywords) ? candidate.missingKeywords : [],
    redFlags: Array.isArray(candidate.redFlags) ? candidate.redFlags : [],
  };
}

function toTailoringStrategy(value: unknown): TailoringStrategy | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<TailoringStrategy>;
  return {
    matchedKeywords: Array.isArray(candidate.matchedKeywords) ? candidate.matchedKeywords : [],
    missingKeywords: Array.isArray(candidate.missingKeywords) ? candidate.missingKeywords : [],
    prioritizedGaps: Array.isArray(candidate.prioritizedGaps) ? candidate.prioritizedGaps : [],
    rewriteGuidance: Array.isArray(candidate.rewriteGuidance) ? candidate.rewriteGuidance : [],
    lowRelevance: Boolean(candidate.lowRelevance),
  };
}

export interface UseTailoringInsightsResult {
  hasTargetJob: boolean;
  baselineAssessment: BaselineAssessment | null;
  tailoringStrategy: TailoringStrategy | null;
  optimizationSatisfied: boolean;
  exportRequested: boolean;
}

const EMPTY_RESULT: UseTailoringInsightsResult = {
  hasTargetJob: false,
  baselineAssessment: null,
  tailoringStrategy: null,
  optimizationSatisfied: false,
  exportRequested: false,
};

/**
 * Subscribes to the authenticated user's derived baseline assessment and
 * tailoring strategy (resume-match-insights) via the same Realtime pattern
 * as `useResumeDraft`/`useTargetJob`, so the UI updates the moment a new
 * turn's derivation persists (5.6) without a reload.
 */
export function useTailoringInsights(userId: string | null): UseTailoringInsightsResult {
  const [result, setResult] = useState<UseTailoringInsightsResult>(EMPTY_RESULT);

  useEffect(() => {
    if (!userId) {
      setResult(EMPTY_RESULT);
      return;
    }

    const supabase = getBrowserClient();
    let cancelled = false;

    const applyRow = (row: TailoringInsightsRow | null | undefined) => {
      if (cancelled) return;
      setResult({
        hasTargetJob: Boolean(row?.target_job_title),
        baselineAssessment: toBaselineAssessment(row?.baseline_assessment),
        tailoringStrategy: toTailoringStrategy(row?.tailoring_strategy),
        optimizationSatisfied: Boolean(row?.optimization_satisfied),
        exportRequested: Boolean(row?.export_requested),
      });
    };

    supabase
      .schema("app")
      .from("resumes")
      .select(
        "target_job_title, baseline_assessment, tailoring_strategy, optimization_satisfied, export_requested"
      )
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => applyRow(data as TailoringInsightsRow | null));

    const channel = supabase
      .channel(`resumes-tailoring-insights:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "app",
          table: "resumes",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => applyRow(payload.new as TailoringInsightsRow)
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return result;
}
