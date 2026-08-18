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

/** Model for the user-facing conversational reply — quality-sensitive, so stays on the top tier. */
export const CONVERSATION_MODEL = "claude-opus-5";
/** Model for the fixed-schema structured-extraction tool-use call — invisible plumbing, cheaper tier suffices. */
export const EXTRACTION_MODEL = "claude-haiku-4-5-20251001";
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
      model: CONVERSATION_MODEL,
      max_tokens: CHAT_MAX_TOKENS,
      // Single cache_control breakpoint over the whole composed system
      // prompt (master prompt + resume/LinkedIn context, plus any
      // target-job/persona sections). Anthropic caches by hashing this
      // block's content: unchanged content across turns hits the cache,
      // and a changed resumeContext naturally produces a different hash
      // and misses — no manual invalidation needed on our end. Combining
      // everything into one block (rather than separate breakpoints for
      // master prompt vs. resume context) also reliably clears Opus 5's
      // 512-token minimum cacheable length, which the ~17-line master
      // prompt alone likely would not (confirmed against current Anthropic
      // docs: docs.anthropic.com/en/docs/build-with-claude/prompt-caching).
      system: [
        {
          type: "text",
          text: params.systemPrompt,
          cache_control: { type: "ephemeral" },
        },
      ],
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
