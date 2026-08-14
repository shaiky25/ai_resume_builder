import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedBrowserClient: SupabaseClient | null = null;

/**
 * Singleton browser-side Supabase client. Uses the public anon key and
 * persists the session to the browser's default storage (localStorage) so a
 * signed-in visitor stays signed in across reloads. This is the only client
 * components should use to call `supabase.auth.*`.
 */
export function getBrowserClient(): SupabaseClient {
  if (cachedBrowserClient) {
    return cachedBrowserClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be set to use the browser client"
    );
  }

  cachedBrowserClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: true, flowType: "pkce" },
  });

  return cachedBrowserClient;
}
