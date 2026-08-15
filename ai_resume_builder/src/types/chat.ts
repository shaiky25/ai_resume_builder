export type MessageRole = "user" | "assistant";

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
