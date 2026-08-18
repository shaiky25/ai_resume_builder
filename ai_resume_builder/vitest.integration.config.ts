import path from "path";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

// Separate from vitest.config.ts (unit tests, no network) because these
// tests exercise real RLS policies, Storage policies, and Realtime against
// a live Supabase project — see supabase/tests/README.md for required env
// vars. Not run by `npm test` or CI; run explicitly via `npm run
// test:integration` once SUPABASE_URL/keys point at a disposable project.
// Vitest, unlike Next.js, does not auto-load .env.local — load it here so
// SUPABASE_URL/SUPABASE_ANON_KEY/SUPABASE_SERVICE_ROLE_KEY reach process.env.
Object.assign(process.env, loadEnv("", __dirname, ""));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["supabase/tests/**/*.integration.test.ts"],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
