"use client";

import type { Session, User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState } from "react";
import { getBrowserClient } from "@/lib/supabase/browserClient";

interface AuthSessionState {
  session: Session | null;
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthSessionState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthSessionState>({
    session: null,
    user: null,
    loading: true,
  });

  useEffect(() => {
    const supabase = getBrowserClient();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setState({ session, user: session?.user ?? null, loading: false });
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ session, user: session?.user ?? null, loading: false });
    });

    return () => subscription.unsubscribe();
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuthSession(): AuthSessionState {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthSession must be used within an AuthProvider");
  }
  return context;
}
