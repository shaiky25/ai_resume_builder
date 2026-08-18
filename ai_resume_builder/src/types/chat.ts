export type MessageRole = "user" | "assistant";

/**
 * The fixed set of coaching styles a user can choose (coach-persona-onboarding).
 * Mirrors the `check` constraint on `profiles.coach_persona` — the server
 * switches on this fixed set to select a tone-modifier block, never
 * interpolating a stored value directly into prompt text.
 */
export type CoachPersona = "momentum" | "steady" | "bold";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
  createdAt: number;
}

/**
 * Distinguishable, user-visible states for every error condition
 * `/api/chat` can return (chat-live-integration).
 */
export type ChatStreamErrorKind = "out_of_credits" | "rate_limited" | "stream_error" | "request_failed";

export interface ChatStreamError {
  kind: ChatStreamErrorKind;
  message: string;
}
