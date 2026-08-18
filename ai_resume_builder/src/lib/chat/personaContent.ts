import type { CoachPersona } from "@/types/chat";

/** Display labels for the persona picker and the chat header affordance. */
export const PERSONA_LABELS: Record<CoachPersona, string> = {
  momentum: "Momentum",
  steady: "Steady",
  bold: "Bold",
};

/** Sample coach lines shown on the picker so the user can "hear" each tone before choosing. */
export const PERSONA_SAMPLE_LINES: Record<CoachPersona, string> = {
  momentum:
    "Let's turn this into your best bullet yet — quick win first, then we build from there.",
  steady:
    "Take your time. We'll work through this one step at a time, at whatever pace works for you.",
  bold: "Cut the hedging — tell me what you actually did, and I'll help you make it land.",
};

/** Static, pre-written greeting rendered as the first message right after a persona is selected. */
export const PERSONA_GREETINGS: Record<CoachPersona, string> = {
  momentum:
    "Hey, I'm your coach! I like to keep things moving — let's get a quick win on the board. Tell me about a recent role or project you're proud of, and we'll turn it into a standout bullet.",
  steady:
    "Hi there, glad you're here. There's no rush with me — whenever you're ready, tell me a bit about your work experience and we'll build this together, one piece at a time.",
  bold: "Alright, let's skip the small talk. Give me the real story on your last role — what you actually delivered — and I'll help you make it hit harder.",
};

/** Suggested prompt chip copy, varying by the selected persona's voice. */
export const PERSONA_SUGGESTED_PROMPTS: Record<CoachPersona, string[]> = {
  momentum: [
    "Let's knock out my last role first",
    "Give me a quick win to start with",
    "Help me draft a punchy summary",
    "What's the fastest way to improve this?",
  ],
  steady: [
    "Walk me through describing my last role",
    "What makes a resume stand out?",
    "Help me write a professional summary, step by step",
    "How should I think about listing my skills?",
  ],
  bold: [
    "Make my last role sound sharper",
    "Tell me straight — what's weak here?",
    "Write me a summary that stands out",
    "Cut the fluff from my skills section",
  ],
};
