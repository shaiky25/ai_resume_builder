"use client";

import { useCallback, useEffect, useState } from "react";
import { getBrowserClient } from "@/lib/supabase/browserClient";
import type { CoachPersona } from "@/types/chat";

interface ProfileRow {
  coach_persona: CoachPersona | null;
}

export interface UseCoachPersonaResult {
  /** undefined while the initial fetch is in flight; null once confirmed unset. */
  coachPersona: CoachPersona | null | undefined;
  setCoachPersona: (persona: CoachPersona) => Promise<void>;
}

/**
 * Subscribes to the authenticated user's `profiles.coach_persona` via
 * Supabase Realtime, plus an initial fetch on mount, mirroring the
 * fetch-plus-subscribe shape `usePremiumDownloadAccess.ts` already has.
 *
 * design.md decision 2: pairs the `postgres_changes` listener with a
 * refetch triggered on the tab regaining visibility and on the
 * subscription's own `SUBSCRIBED` callback firing after a reconnect —
 * closing the "silently stale after a dropped socket" gap that
 * `usePremiumDownloadAccess.ts` still has, without adding a second,
 * always-on polling read path.
 */
export function useCoachPersona(userId: string | null): UseCoachPersonaResult {
  const [coachPersona, setCoachPersonaState] = useState<CoachPersona | null | undefined>(
    undefined
  );

  useEffect(() => {
    if (!userId) {
      setCoachPersonaState(undefined);
      return;
    }

    const supabase = getBrowserClient();
    let cancelled = false;

    const applyRow = (row: ProfileRow | null | undefined) => {
      if (cancelled) return;
      setCoachPersonaState(row?.coach_persona ?? null);
    };

    const fetchPersona = () => {
      supabase
        .schema("app")
        .from("profiles")
        .select("coach_persona")
        .eq("user_id", userId)
        .maybeSingle()
        .then(({ data }) => applyRow(data as ProfileRow | null));
    };

    fetchPersona();

    const channel = supabase
      .channel(`profiles-coach-persona:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "app",
          table: "profiles",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => applyRow(payload.new as ProfileRow)
      )
      .subscribe((status) => {
        // 5.2: fires on the initial join and again after any reconnect
        // following a drop — refetch rather than trusting the possibly-stale
        // in-memory value from before the drop.
        if (status === "SUBSCRIBED") {
          fetchPersona();
        }
      });

    // 5.1: a dropped websocket has no callback of its own on the tab side —
    // refetch whenever the tab regains visibility so a backgrounded tab
    // can't silently strand the user on a stale value.
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchPersona();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const setCoachPersona = useCallback(
    async (persona: CoachPersona) => {
      if (!userId) return;
      const supabase = getBrowserClient();
      const { error } = await supabase
        .schema("app")
        .from("profiles")
        .update({ coach_persona: persona })
        .eq("user_id", userId);

      if (error) {
        throw new Error(`Failed to update coach_persona: ${error.message}`);
      }
      setCoachPersonaState(persona);
    },
    [userId]
  );

  return { coachPersona, setCoachPersona };
}
