"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { getBrowserClient } from "@/lib/supabase/browserClient";

type AuthMode = "sign-in" | "sign-up";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const supabase = getBrowserClient();
    const { error: authError } =
      mode === "sign-up"
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });

    setIsSubmitting(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    router.push("/");
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    const supabase = getBrowserClient();
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/` },
    });

    if (authError) {
      setError(authError.message);
    }
  };

  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            {mode === "sign-up" ? "Create an account" : "Sign in"}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            autoComplete="email"
            className="w-full rounded-full border border-zinc-300 px-4 py-2 text-sm text-zinc-900 outline-none dark:border-zinc-700 dark:text-zinc-50"
          />
          <input
            type="password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
            className="w-full rounded-full border border-zinc-300 px-4 py-2 text-sm text-zinc-900 outline-none dark:border-zinc-700 dark:text-zinc-50"
          />

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {mode === "sign-up" ? "Sign up" : "Sign in"}
          </button>
        </form>

        <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
          <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
          or
          <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          className="w-full rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-800"
        >
          Continue with Google
        </button>

        <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
          {mode === "sign-up" ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            type="button"
            onClick={() => {
              setError(null);
              setMode(mode === "sign-up" ? "sign-in" : "sign-up");
            }}
            className="font-medium text-zinc-900 underline dark:text-zinc-50"
          >
            {mode === "sign-up" ? "Sign in" : "Sign up"}
          </button>
        </p>
      </div>
    </div>
  );
}
