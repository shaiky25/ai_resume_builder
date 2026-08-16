import type { SupabaseClient } from "@supabase/supabase-js";
import { getServiceClient } from "@/lib/supabase/serviceClient";
import type { TargetJob } from "@/types/resume";

export interface ResumeContext {
  rawText: string | null;
  structuredOutput: unknown;
  targetJob: TargetJob | null;
  baselineAssessment: unknown;
  tailoringStrategy: unknown;
}

export interface ResumeContextGateway {
  /**
   * Fetches the authenticated user's most recently updated resume/LinkedIn
   * context, target job, and derived tailoring state. This is the ONLY
   * source of this context the composed Claude prompt uses — never the
   * client's request body.
   */
  getLatestResumeContext(userId: string): Promise<ResumeContext | null>;

  /**
   * Persists derived structured resume data (resume-structured-extraction)
   * to the user's most recently updated `resumes` row, scoped to `userId`
   * on every read and write so extraction output for one user can never
   * land on another user's row. Updates the existing row if one exists,
   * otherwise inserts a new one.
   */
  persistStructuredOutput(userId: string, structuredOutput: unknown): Promise<void>;

  /**
   * Persists the baseline assessment (resume-optimization-strategy 3.9),
   * scoped to `userId`, replacing any previously stored value.
   */
  persistBaselineAssessment(userId: string, baselineAssessment: unknown): Promise<void>;

  /**
   * Persists the derived tailoring strategy (resume-optimization-strategy
   * 3.9), scoped to `userId`, replacing any previously stored value.
   */
  persistTailoringStrategy(userId: string, tailoringStrategy: unknown): Promise<void>;

  /**
   * Persists the satisfaction/export-request signal (3.15). Only ever
   * called to set a flag to `true` — callers never overwrite an
   * already-true flag back to `false` mid-session, since satisfaction is a
   * one-way determination for a given target job (reset only when the
   * target job itself changes, via `useTargetJob`'s submit path).
   */
  persistSatisfactionSignal(
    userId: string,
    signal: { optimizationSatisfied?: boolean; exportRequested?: boolean }
  ): Promise<void>;
}

export class SupabaseResumeContextGateway implements ResumeContextGateway {
  constructor(private readonly client: SupabaseClient = getServiceClient()) {}

  async getLatestResumeContext(userId: string): Promise<ResumeContext | null> {
    const { data, error } = await this.client
      .from("resumes")
      .select(
        "raw_text, structured_output, target_job_title, target_job_company, target_job_description, baseline_assessment, tailoring_strategy"
      )
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch resume context: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    const targetJobTitle = data.target_job_title as string | null;
    const targetJobDescription = data.target_job_description as string | null;

    return {
      rawText: (data.raw_text as string | null) ?? null,
      structuredOutput: data.structured_output ?? null,
      targetJob:
        targetJobTitle && targetJobDescription
          ? {
              title: targetJobTitle,
              company: (data.target_job_company as string | null) ?? "",
              description: targetJobDescription,
            }
          : null,
      baselineAssessment: data.baseline_assessment ?? null,
      tailoringStrategy: data.tailoring_strategy ?? null,
    };
  }

  /**
   * Finds the id of the user's most recently updated `resumes` row, scoped
   * to `userId` on the lookup itself so a caller can never resolve another
   * user's row id.
   */
  private async findLatestRowId(userId: string): Promise<string | null> {
    const { data, error } = await this.client
      .from("resumes")
      .select("id")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to look up existing resume row: ${error.message}`);
    }

    return (data?.id as string | undefined) ?? null;
  }

  /**
   * Updates the user's existing `resumes` row with `columns` if one exists,
   * otherwise inserts a new row — both scoped to `userId` — shared by every
   * persist method below (structured output, baseline assessment,
   * tailoring strategy, satisfaction signal).
   */
  private async upsertColumns(
    userId: string,
    columns: Record<string, unknown>,
    errorLabel: string
  ): Promise<void> {
    const existingId = await this.findLatestRowId(userId);

    if (existingId) {
      const { error } = await this.client
        .from("resumes")
        .update({ ...columns, updated_at: new Date().toISOString() })
        .eq("id", existingId)
        .eq("user_id", userId);

      if (error) {
        throw new Error(`Failed to update ${errorLabel}: ${error.message}`);
      }
      return;
    }

    const { error } = await this.client.from("resumes").insert({ user_id: userId, ...columns });

    if (error) {
      throw new Error(`Failed to insert resumes row for ${errorLabel}: ${error.message}`);
    }
  }

  async persistStructuredOutput(userId: string, structuredOutput: unknown): Promise<void> {
    await this.upsertColumns(userId, { structured_output: structuredOutput }, "structured_output");
  }

  async persistBaselineAssessment(userId: string, baselineAssessment: unknown): Promise<void> {
    await this.upsertColumns(
      userId,
      { baseline_assessment: baselineAssessment },
      "baseline_assessment"
    );
  }

  async persistTailoringStrategy(userId: string, tailoringStrategy: unknown): Promise<void> {
    await this.upsertColumns(
      userId,
      { tailoring_strategy: tailoringStrategy },
      "tailoring_strategy"
    );
  }

  async persistSatisfactionSignal(
    userId: string,
    signal: { optimizationSatisfied?: boolean; exportRequested?: boolean }
  ): Promise<void> {
    const columns: Record<string, unknown> = {};
    if (signal.optimizationSatisfied) columns.optimization_satisfied = true;
    if (signal.exportRequested) columns.export_requested = true;
    if (Object.keys(columns).length === 0) return;

    await this.upsertColumns(userId, columns, "satisfaction_signal");
  }
}
