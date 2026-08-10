import Anthropic from "@anthropic-ai/sdk";
import type { ChatTurnInput } from "./types";

let cachedClient: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (cachedClient) {
    return cachedClient;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY must be set");
  }

  cachedClient = new Anthropic({ apiKey });
  return cachedClient;
}

export const CHAT_MODEL = "claude-opus-5";
export const CHAT_MAX_TOKENS = 4096;

export interface ChatStreamEvent {
  type: "text_delta";
  text: string;
}

export interface ChatUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface ChatStream {
  events: AsyncIterable<ChatStreamEvent>;
  /** Resolves once the stream has fully completed. */
  finalUsage(): Promise<ChatUsage>;
}

export interface StreamChatParams {
  systemPrompt: string;
  history: ChatTurnInput[];
  userMessage: string;
}

export interface ChatModelClient {
  /**
   * Opens a streaming completion. The composed system prompt is passed as
   * `systemPrompt` here — this function's return value/events never
   * include it, only Claude's generated output.
   */
  streamChat(params: StreamChatParams): ChatStream;
}

export class AnthropicChatModelClient implements ChatModelClient {
  streamChat(params: StreamChatParams): ChatStream {
    const client = getAnthropicClient();

    const stream = client.messages.stream({
      model: CHAT_MODEL,
      max_tokens: CHAT_MAX_TOKENS,
      system: params.systemPrompt,
      messages: [
        ...params.history.map((turn) => ({
          role: turn.role,
          content: turn.content,
        })),
        { role: "user" as const, content: params.userMessage },
      ],
    });

    async function* toEvents(): AsyncGenerator<ChatStreamEvent> {
      for await (const event of stream) {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          yield { type: "text_delta", text: event.delta.text };
        }
      }
    }

    return {
      events: toEvents(),
      finalUsage: async () => {
        const message = await stream.finalMessage();
        return {
          inputTokens: message.usage.input_tokens,
          outputTokens: message.usage.output_tokens,
        };
      },
    };
  }
}
