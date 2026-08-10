export type ChatMessageRole = "user" | "assistant";

export interface ChatTurnInput {
  role: ChatMessageRole;
  content: string;
}

/**
 * The shape of the client's POST /api/chat body. Note: any resume/LinkedIn
 * content the client includes here is intentionally never trusted as a
 * substitute for the server-fetched `resumes` row (chat-system-prompt-injection).
 */
export interface ChatApiRequestBody {
  message: string;
  history?: ChatTurnInput[];
}
