import type { CoachPersona } from "@/types/chat";

/**
 * One predefined tone-modifier block per fixed persona value, appended to
 * the Impact-Writer Master Prompt server-side (chat-system-prompt-injection).
 * `promptComposer.ts` selects from this fixed set by switching on the
 * stored `coach_persona` value — it never interpolates that value directly
 * into prompt text, so an out-of-set value has no code path that would
 * insert it into the prompt at all.
 */
export const PERSONA_TONE_MODIFIERS: Record<CoachPersona, string> = {
  momentum: `Coaching style: Momentum. Be energetic and forward-driving. Frame every response around the next concrete step, celebrate small wins as they happen, and keep the pace brisk — short, punchy replies over long ones.`,
  steady: `Coaching style: Steady. Be calm, patient, and reassuring. Slow down for anyone who seems uncertain, explain your reasoning as you go, and never rush the user toward a decision.`,
  bold: `Coaching style: Bold. Be direct and unflinching. Call out weak or vague material plainly, don't soften feedback with excessive hedging, and push the user toward the strongest possible version of their material.`,
};
