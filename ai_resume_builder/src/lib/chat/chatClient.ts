import type { ChatTurnInput } from "./types";
import type { ChatStreamError } from "@/types/chat";

export interface StreamChatMessageParams {
  accessToken: string;
  message: string;
  history: ChatTurnInput[];
  signal?: AbortSignal;
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (error: ChatStreamError) => void;
}

/**
 * Client-side counterpart to `/api/chat`'s SSE contract
 * (chat-response-streaming, consumed for real here for the first time).
 * Pre-stream error responses (401/403 out_of_credits/429/500/502) and a
 * mid-stream `event: error` are all normalized into `onError` so the caller
 * never has to special-case where in the response an error came from.
 * Exactly one of onDone/onError is ever called.
 */
export async function streamChatMessage(params: StreamChatMessageParams): Promise<void> {
  const { accessToken, message, history, signal, onDelta, onDone, onError } = params;

  let response: Response;
  try {
    response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ message, history }),
      signal,
    });
  } catch {
    onError({ kind: "request_failed", message: "Could not reach the server. Please try again." });
    return;
  }

  if (!response.ok) {
    let errorCode: string | undefined;
    try {
      const body = (await response.json()) as { error?: string };
      errorCode = body.error;
    } catch {
      // Non-JSON error body — fall through to the generic mapping below.
    }

    if (response.status === 403 && errorCode === "out_of_credits") {
      onError({ kind: "out_of_credits", message: "You're out of credits." });
    } else if (response.status === 429) {
      onError({
        kind: "rate_limited",
        message: "You're sending messages too quickly. Please wait a moment and try again.",
      });
    } else {
      onError({ kind: "request_failed", message: "Something went wrong. Please try again." });
    }
    return;
  }

  if (!response.body) {
    onError({ kind: "request_failed", message: "Empty response from server." });
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let boundary = buffer.indexOf("\n\n");
    while (boundary !== -1) {
      const rawEvent = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      boundary = buffer.indexOf("\n\n");

      const { event, data } = parseSseEvent(rawEvent);

      if (event === "message") {
        try {
          const parsed = JSON.parse(data) as { text?: string };
          if (parsed.text) onDelta(parsed.text);
        } catch {
          // Malformed delta — ignore rather than crash the stream.
        }
      } else if (event === "done") {
        onDone();
        return;
      } else if (event === "error") {
        onError({ kind: "stream_error", message: "The response was interrupted. Please try again." });
        return;
      }
    }
  }
}

function parseSseEvent(raw: string): { event: string; data: string } {
  let event = "message";
  let data = "";
  for (const line of raw.split("\n")) {
    if (line.startsWith("event:")) {
      event = line.slice("event:".length).trim();
    } else if (line.startsWith("data:")) {
      data = line.slice("data:".length).trim();
    }
  }
  return { event, data };
}
