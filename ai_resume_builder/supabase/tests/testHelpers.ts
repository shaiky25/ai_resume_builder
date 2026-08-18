import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

/**
 * True only when a live Supabase project's credentials are present. Every
 * integration test suite in this directory gates on this so the file is
 * inert (no failing tests) when run without a configured project.
 */
export const hasLiveSupabaseEnv = Boolean(
  process.env.SUPABASE_URL &&
    process.env.SUPABASE_ANON_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export function getServiceClient(): SupabaseClient {
  return createClient(
    process.env.SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string,
    { auth: { persistSession: false, autoRefreshToken: false }, db: { schema: "app" } }
  );
}

export interface TestUser {
  id: string;
  email: string;
  /** Client authenticated as this user (anon key + this user's session). */
  client: SupabaseClient;
}

const TEST_PASSWORD = "integration-test-password-1!";

/**
 * Creates a confirmed Auth user via the admin API and returns a client
 * signed in as them. Relies on the onboarding trigger (migration
 * 20260812000001) to populate profiles/user_credits rows.
 */
export async function createTestUser(service: SupabaseClient): Promise<TestUser> {
  const email = `rls-test-${randomUUID()}@example.com`;

  const { data, error } = await service.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
  });

  if (error || !data.user) {
    throw new Error(`Failed to create test user: ${error?.message}`);
  }

  const client = createClient(
    process.env.SUPABASE_URL as string,
    process.env.SUPABASE_ANON_KEY as string,
    { auth: { persistSession: false, autoRefreshToken: false }, db: { schema: "app" } }
  );

  const { error: signInError } = await client.auth.signInWithPassword({
    email,
    password: TEST_PASSWORD,
  });

  if (signInError) {
    throw new Error(`Failed to sign in test user: ${signInError.message}`);
  }

  return { id: data.user.id, email, client };
}

/** Deletes a test user; cascades to profiles/user_credits/resumes/etc. via FK. */
export async function deleteTestUser(service: SupabaseClient, userId: string): Promise<void> {
  await service.auth.admin.deleteUser(userId);
}
