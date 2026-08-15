import type { SupabaseClient } from "@supabase/supabase-js";
import { getServiceClient } from "@/lib/supabase/serviceClient";

export interface ResumeContext {
  rawText: string | null;
  structuredOutput: unknown;
}

export interface ResumeContextGateway {
  /**
   * Fetches the authenticated user's most recently updated resume/LinkedIn
   * context. This is the ONLY source of resume/LinkedIn context the
   * composed Claude prompt uses — never the client's request body.
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
}

export class SupabaseResumeContextGateway implements ResumeContextGateway {
  constructor(private readonly client: SupabaseClient = getServiceClient()) {}

  async getLatestResumeContext(userId: string): Promise<ResumeContext | null> {
    const { data, error } = await this.client
      .from("resumes")
      .select("raw_text, structured_output")
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

    return {
      rawText: (data.raw_text as string | null) ?? null,
      structuredOutput: data.structured_output ?? null,
    };
  }

  async persistStructuredOutput(userId: string, structuredOutput: unknown): Promise<void> {
    const { data: existing, error: selectError } = await this.client
      .from("resumes")
      .select("id")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (selectError) {
      throw new Error(`Failed to look up existing resume row: ${selectError.message}`);
    }

    if (existing) {
      const { error } = await this.client
        .from("resumes")
        .update({ structured_output: structuredOutput, updated_at: new Date().toISOString() })
        .eq("id", existing.id as string)
        .eq("user_id", userId);

      if (error) {
        throw new Error(`Failed to update resumes.structured_output: ${error.message}`);
      }
      return;
    }

    const { error } = await this.client
      .from("resumes")
      .insert({ user_id: userId, structured_output: structuredOutput });

    if (error) {
      throw new Error(`Failed to insert resumes row: ${error.message}`);
    }
  }
}
