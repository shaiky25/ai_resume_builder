import type { BaselineAssessment, TailoringStrategy } from "@/types/resume";

interface MatchInsightsProps {
  hasTargetJob: boolean;
  baselineAssessment: BaselineAssessment | null;
  tailoringStrategy: TailoringStrategy | null;
}

/**
 * Displays the derived baseline assessment and tailoring strategy's match
 * coverage next to the resume preview (resume-match-insights). Hidden
 * entirely when no target job is set (5.5); shows a pending state between
 * target-job submission and baseline completion (5.2); shows a low-relevance
 * notice instead of match coverage when flagged (5.4).
 */
export function MatchInsights({
  hasTargetJob,
  baselineAssessment,
  tailoringStrategy,
}: MatchInsightsProps) {
  if (!hasTargetJob) {
    return null;
  }

  return (
    <div className="flex max-h-64 shrink-0 flex-col gap-3 overflow-y-auto border-b border-zinc-200 px-4 py-3 text-sm dark:border-zinc-800">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Match insights
      </h3>

      {!baselineAssessment ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Assessing how your resume matches this job…
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {baselineAssessment.matchScore}
              <span className="text-xs font-normal text-zinc-500">/100 match</span>
            </span>
          </div>

          {baselineAssessment.missingKeywords.length > 0 && (
            <div>
              <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Top missing keywords
              </p>
              <div className="flex flex-wrap gap-1">
                {baselineAssessment.missingKeywords.map((keyword) => (
                  <span
                    key={keyword}
                    className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}

          {baselineAssessment.redFlags.length > 0 && (
            <div>
              <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Red flags</p>
              <ul className="list-inside list-disc text-xs text-zinc-600 dark:text-zinc-400">
                {baselineAssessment.redFlags.map((flag) => (
                  <li key={flag}>{flag}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {tailoringStrategy?.lowRelevance && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          This job doesn&apos;t share much overlap with your current experience — treat the match
          coverage below with caution.
        </p>
      )}

      {tailoringStrategy && !tailoringStrategy.lowRelevance && (
        <div className="flex flex-col gap-2">
          {tailoringStrategy.matchedKeywords.length > 0 && (
            <div>
              <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Matched</p>
              <div className="flex flex-wrap gap-1">
                {tailoringStrategy.matchedKeywords.map((keyword) => (
                  <span
                    key={keyword}
                    className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}

          {tailoringStrategy.missingKeywords.length > 0 && (
            <div>
              <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Missing</p>
              <div className="flex flex-wrap gap-1">
                {tailoringStrategy.missingKeywords.map((keyword) => (
                  <span
                    key={keyword}
                    className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}

          {tailoringStrategy.prioritizedGaps.length > 0 && (
            <div>
              <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Gaps to address</p>
              <ul className="list-inside list-disc text-xs text-zinc-600 dark:text-zinc-400">
                {tailoringStrategy.prioritizedGaps.map((gap) => (
                  <li key={gap}>{gap}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
