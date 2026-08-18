import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedServiceClient: SupabaseClient | null = null;

/**
 * Singleton service-role Supabase client. Bypasses RLS entirely, so this
 * must never be constructed with anything other than the service-role key,
 * and the resulting client must never be exposed to or derived from client
 * input. This is the only client permitted to write to user_credits,
 * credit_ledger, and analytics_events, and the only client that reads
 * resumes on the user's behalf server-side.
 */
export function getServiceClient(): SupabaseClient {
  if (cachedServiceClient) {
    return cachedServiceClient;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set to use the service-role client"
    );
  }

  cachedServiceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: "app" },
  });

  return cachedServiceClient;
}
