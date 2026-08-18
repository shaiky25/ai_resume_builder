import { describe, expect, it } from "vitest";
import { composeSystemPrompt } from "./promptComposer";
import { IMPACT_WRITER_MASTER_PROMPT } from "./masterPrompt";
import type { ResumeContext } from "./resumeContext";

const baseContext: ResumeContext = {
  rawText: null,
  structuredOutput: null,
  targetJob: null,
  baselineAssessment: null,
  tailoringStrategy: null,
};

describe("composeSystemPrompt", () => {
  // 4.2 — no target-job/tailoring content is appended when no target job is set
  it("omits target job and tailoring strategy content when no target job is set", () => {
    const prompt = composeSystemPrompt({
      ...baseContext,
      structuredOutput: { name: "Jordan" },
    });

    expect(prompt).not.toContain("target job");
    expect(prompt).not.toContain("tailoring strategy");
  });

  // 4.1 — target job description + tailoring strategy are appended when present
  it("appends the target job description and tailoring strategy when a target job is set", () => {
    const prompt = composeSystemPrompt({
      ...baseContext,
      structuredOutput: { name: "Jordan" },
      targetJob: {
        title: "Backend Engineer",
        company: "Acme",
        description: "Build scalable APIs in Go.",
      },
      baselineAssessment: { matchScore: 55, missingKeywords: ["Go"], redFlags: [] },
      tailoringStrategy: {
        lowRelevance: false,
        matchedKeywords: ["APIs"],
        missingKeywords: ["Go"],
        prioritizedGaps: ["Go experience"],
        rewriteGuidance: ["..."],
      },
    });

    expect(prompt).toContain(IMPACT_WRITER_MASTER_PROMPT);
    expect(prompt).toContain("Backend Engineer");
    expect(prompt).toContain("Build scalable APIs in Go.");
    expect(prompt).toContain("Baseline assessment");
    expect(prompt).toContain("Derived tailoring strategy");
    expect(prompt).toContain("never change resume content based on a suggestion");
  });

  // Confirms the target job is appended even with no resume/LinkedIn context yet.
  it("appends target job context even when there is no resume/LinkedIn context yet", () => {
    const prompt = composeSystemPrompt({
      ...baseContext,
      targetJob: { title: "Data Analyst", company: "", description: "Analyze data." },
    });

    expect(prompt).toContain("Data Analyst");
  });

  it("returns just the master prompt when there is no context at all", () => {
    expect(composeSystemPrompt(null)).toBe(IMPACT_WRITER_MASTER_PROMPT);
  });

  // 2.3/2.4 (coach-persona-onboarding) — persona tone-modifier selection
  it("appends the matching tone-modifier block for a fixed persona value", () => {
    const prompt = composeSystemPrompt(baseContext, "momentum");

    expect(prompt).toContain("Coaching style: Momentum");
  });

  it("selects a different tone-modifier block for a different persona value", () => {
    const boldPrompt = composeSystemPrompt(baseContext, "bold");
    const steadyPrompt = composeSystemPrompt(baseContext, "steady");

    expect(boldPrompt).toContain("Coaching style: Bold");
    expect(boldPrompt).not.toContain("Coaching style: Steady");
    expect(steadyPrompt).toContain("Coaching style: Steady");
    expect(steadyPrompt).not.toContain("Coaching style: Bold");
  });

  it("appends no tone-modifier block when coach_persona is null", () => {
    expect(composeSystemPrompt(baseContext, null)).toBe(IMPACT_WRITER_MASTER_PROMPT);
    expect(composeSystemPrompt(null, null)).toBe(IMPACT_WRITER_MASTER_PROMPT);
  });

  it("appends the tone-modifier block alongside target job and resume context", () => {
    const prompt = composeSystemPrompt(
      {
        ...baseContext,
        targetJob: { title: "Backend Engineer", company: "Acme", description: "Build APIs." },
      },
      "bold"
    );

    expect(prompt).toContain("Coaching style: Bold");
    expect(prompt).toContain("Backend Engineer");
  });
});
