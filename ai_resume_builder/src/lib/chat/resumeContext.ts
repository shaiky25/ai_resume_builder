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
}
