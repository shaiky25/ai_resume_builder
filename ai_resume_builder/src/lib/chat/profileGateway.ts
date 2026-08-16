import type { SupabaseClient } from "@supabase/supabase-js";
import { getServiceClient } from "@/lib/supabase/serviceClient";
import type { CoachPersona } from "@/types/chat";

export interface ProfileGateway {
  /**
   * Fetches the authenticated user's stored `coach_persona`, or null if
   * unset. This is the ONLY source of persona the composed Claude prompt
   * uses — never a client-supplied value from the request body
   * (chat-system-prompt-injection).
   */
  getCoachPersona(userId: string): Promise<CoachPersona | null>;
}

export class SupabaseProfileGateway implements ProfileGateway {
  constructor(private readonly client: SupabaseClient = getServiceClient()) {}

  async getCoachPersona(userId: string): Promise<CoachPersona | null> {
    const { data, error } = await this.client
      .from("profiles")
      .select("coach_persona")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch coach_persona: ${error.message}`);
    }

    return (data?.coach_persona as CoachPersona | null) ?? null;
  }
}
