"use client";

import { useState } from "react";
import type { CoachPersona } from "@/types/chat";
import { PERSONA_LABELS, PERSONA_SAMPLE_LINES } from "@/lib/chat/personaContent";

const PERSONA_ORDER: CoachPersona[] = ["momentum", "steady", "bold"];

interface PersonaPickerProps {
  onSelect: (persona: CoachPersona) => void;
  isSaving?: boolean;
  title?: string;
  description?: string;
}

export function PersonaPicker({
  onSelect,
  isSaving = false,
  title = "How would you like your coach to sound?",
  description = "Pick a coaching style. You can change it anytime from the chat header.",
}: PersonaPickerProps) {
  const [pendingPersona, setPendingPersona] = useState<CoachPersona | null>(null);

  const handleSelect = (persona: CoachPersona) => {
    setPendingPersona(persona);
    onSelect(persona);
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-12 text-center">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">{title}</h1>
        <p className="mt-2 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
      </div>
      <div className="grid w-full max-w-2xl gap-4 sm:grid-cols-3">
        {PERSONA_ORDER.map((persona) => (
          <button
            key={persona}
            type="button"
            disabled={isSaving}
            onClick={() => handleSelect(persona)}
            className="flex flex-col gap-2 rounded-2xl border border-zinc-300 bg-white/80 p-4 text-left transition-colors hover:border-indigo-400 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900/80 dark:hover:border-indigo-500 dark:hover:bg-indigo-950/40"
          >
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              {PERSONA_LABELS[persona]}
              {isSaving && pendingPersona === persona ? "…" : ""}
            </span>
            <span className="text-sm text-zinc-600 dark:text-zinc-300">
              &ldquo;{PERSONA_SAMPLE_LINES[persona]}&rdquo;
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
