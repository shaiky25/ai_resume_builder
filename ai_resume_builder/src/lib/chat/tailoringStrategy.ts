import { getAnthropicClient, CONVERSATION_MODEL } from "./anthropicClient";
import type { BaselineAssessment, TailoringStrategy, TargetJob } from "@/types/resume";

/**
 * Baseline-assessment tool schema (resume-optimization-strategy 3.2):
 * a senior-recruiter-for-this-company read on the resume as it stands
 * today, produced once per target job before any rewrite guidance (3.3).
 */
export const BASELINE_ASSESSMENT_TOOL_NAME = "record_baseline_assessment";

export const BASELINE_ASSESSMENT_TOOL = {
  name: BASELINE_ASSESSMENT_TOOL_NAME,
  description:
    "Records a baseline assessment of how the candidate's current resume stacks up against the target job, from the perspective of a senior recruiter for this specific company doing a first-pass read. Be honest and specific — this is shown to the user before any rewrite guidance.",
  input_schema: {
    type: "object" as const,
    properties: {
      matchScore: {
        type: "integer",
        description:
          "An estimated match score from 0-100 for how well the resume currently fits the target job. This is a directional estimate for orientation, not a certified ATS score.",
      },
      missingKeywords: {
        type: "array",
        description:
          "The top five (at most) keywords/skills from the job description that are missing from the resume, ordered by importance.",
        items: { type: "string" },
      },
      redFlags: {
        type: "array",
        description:
          "The three most significant red flags a hiring manager would notice quickly (e.g. unexplained gaps, vague/unquantified bullets, irrelevant content) — at most three.",
        items: { type: "string" },
      },
    },
    required: ["matchScore", "missingKeywords", "redFlags"],
  },
};

/**
 * Tailoring-strategy tool schema (resume-optimization-strategy 3.4-3.8):
 * keyword/skill coverage plus prioritized, grounded rewrite guidance,
 * derived only after a baseline assessment already exists for the target
 * job (3.3).
 */
export const TAILORING_STRATEGY_TOOL_NAME = "record_tailoring_strategy";

export const TAILORING_STRATEGY_TOOL = {
  name: TAILORING_STRATEGY_TOOL_NAME,
  description:
    "Records the tailoring strategy comparing the candidate's structured resume data against the target job description. Ground every claim in the structured resume data provided — never invent experience, skills, or credentials the candidate doesn't have. If the target job has no reasonable relevance to the candidate's background, set lowRelevance to true instead of force-fitting a strategy.",
  input_schema: {
    type: "object" as const,
    properties: {
      lowRelevance: {
        type: "boolean",
        description:
          "True only if the resume shares no meaningful overlap with the target job's core responsibilities or required skills. When true, other fields should be empty/minimal rather than force-fitted.",
      },
      matchedKeywords: {
        type: "array",
        description: "Keywords/skills from the job description already present in the resume.",
        items: { type: "string" },
      },
      missingKeywords: {
        type: "array",
        description:
          "Keywords/skills the job description requires that are absent from the structured resume data — surfaced as gaps, never fabricated as matches.",
        items: { type: "string" },
      },
      prioritizedGaps: {
        type: "array",
        description: "The most important gaps to address, ordered by priority.",
        items: { type: "string" },
      },
      rewriteGuidance: {
        type: "array",
        description:
          "Rewrite suggestions for experience bullets, each structured as an accomplishment, the metric it was measured by, and the method used to achieve it. Weave in missing keywords only where genuinely grounded in the candidate's real, existing experience. Include guidance to remove or reframe any red flags (gaps, vague/unquantified statements, irrelevant content).",
        items: { type: "string" },
      },
    },
    required: [
      "lowRelevance",
      "matchedKeywords",
      "missingKeywords",
      "prioritizedGaps",
      "rewriteGuidance",
    ],
  },
};

function normalizeBaselineAssessment(input: unknown): BaselineAssessment | null {
  if (!input || typeof input !== "object") return null;
  const candidate = input as Record<string, unknown>;
  if (typeof candidate.matchScore !== "number") return null;

  return {
    matchScore: Math.max(0, Math.min(100, Math.round(candidate.matchScore))),
    missingKeywords: Array.isArray(candidate.missingKeywords)
      ? candidate.missingKeywords.filter((item): item is string => typeof item === "string").slice(0, 5)
      : [],
    redFlags: Array.isArray(candidate.redFlags)
      ? candidate.redFlags.filter((item): item is string => typeof item === "string").slice(0, 3)
      : [],
  };
}

function normalizeTailoringStrategy(input: unknown): TailoringStrategy | null {
  if (!input || typeof input !== "object") return null;
  const candidate = input as Record<string, unknown>;

  const asStringArray = (value: unknown): string[] =>
    Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

  return {
    lowRelevance: Boolean(candidate.lowRelevance),
    matchedKeywords: asStringArray(candidate.matchedKeywords),
    missingKeywords: asStringArray(candidate.missingKeywords),
    prioritizedGaps: asStringArray(candidate.prioritizedGaps),
    rewriteGuidance: asStringArray(candidate.rewriteGuidance),
  };
}

function formatTargetJob(targetJob: TargetJob): string {
  return `Target job title: ${targetJob.title}\nCompany: ${targetJob.company || "(not specified)"}\nJob description:\n${targetJob.description}`;
}

export interface TailoringStrategyModelClient {
  /** Derives the one-time-per-target-job baseline assessment (3.2/3.3). */
  deriveBaselineAssessment(
    targetJob: TargetJob,
    structuredResume: unknown
  ): Promise<BaselineAssessment | null>;

  /** Derives the per-turn tailoring strategy (3.4-3.8), only once a baseline exists. */
  deriveTailoringStrategy(
    targetJob: TargetJob,
    structuredResume: unknown
  ): Promise<TailoringStrategy | null>;
}

export class AnthropicTailoringStrategyModelClient implements TailoringStrategyModelClient {
  async deriveBaselineAssessment(
    targetJob: TargetJob,
    structuredResume: unknown
  ): Promise<BaselineAssessment | null> {
    const client = getAnthropicClient();

    const message = await client.messages.create({
      model: CONVERSATION_MODEL,
      max_tokens: 1024,
      tools: [BASELINE_ASSESSMENT_TOOL],
      tool_choice: { type: "tool", name: BASELINE_ASSESSMENT_TOOL_NAME },
      messages: [
        {
          role: "user",
          content: `${formatTargetJob(targetJob)}\n\nCandidate's current structured resume data:\n${JSON.stringify(structuredResume ?? {})}\n\nCall the ${BASELINE_ASSESSMENT_TOOL_NAME} tool now with an honest baseline assessment.`,
        },
      ],
    });

    const toolUse = message.content.find((block) => block.type === "tool_use") as
      | { type: "tool_use"; input: unknown }
      | undefined;

    return toolUse ? normalizeBaselineAssessment(toolUse.input) : null;
  }

  async deriveTailoringStrategy(
    targetJob: TargetJob,
    structuredResume: unknown
  ): Promise<TailoringStrategy | null> {
    const client = getAnthropicClient();

    const message = await client.messages.create({
      model: CONVERSATION_MODEL,
      max_tokens: 2048,
      tools: [TAILORING_STRATEGY_TOOL],
      tool_choice: { type: "tool", name: TAILORING_STRATEGY_TOOL_NAME },
      messages: [
        {
          role: "user",
          content: `${formatTargetJob(targetJob)}\n\nCandidate's current structured resume data:\n${JSON.stringify(structuredResume ?? {})}\n\nCall the ${TAILORING_STRATEGY_TOOL_NAME} tool now.`,
        },
      ],
    });

    const toolUse = message.content.find((block) => block.type === "tool_use") as
      | { type: "tool_use"; input: unknown }
      | undefined;

    return toolUse ? normalizeTailoringStrategy(toolUse.input) : null;
  }
}
