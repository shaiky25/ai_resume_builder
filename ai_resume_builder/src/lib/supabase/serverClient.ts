import { createClient } from "@supabase/supabase-js";

/**
 * The authenticated user identity derived from a verified Supabase JWT.
 * This is the ONLY source of user identity the /api/chat route trusts —
 * never a client-supplied user id from the request body.
 */
export interface AuthenticatedUser {
  id: string;
}

/**
 * Verifies the caller's Supabase JWT server-side and returns the
 * authenticated user's id, or null if the header is missing/malformed or
 * the token fails verification.
 *
 * This creates a request-scoped Supabase client using the anon key plus
 * the caller's own Authorization header, then calls auth.getUser(token) —
 * which round-trips to Supabase Auth to verify the JWT rather than trusting
 * an unverified, client-decoded token.
 */
export async function verifyRequestUser(
  authorizationHeader: string | null
): Promise<AuthenticatedUser | null> {
  if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authorizationHeader.slice("Bearer ".length).trim();
  if (!token) {
    return null;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_ANON_KEY must be set to verify requests"
    );
  }

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authorizationHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user) {
    return null;
  }

  return { id: data.user.id };
}
