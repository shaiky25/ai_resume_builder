import { beforeEach, describe, expect, it, vi } from "vitest";

// Mocks the raw "@anthropic-ai/sdk" package (rather than a wrapper module,
// since this file tests anthropicClient.ts itself) so `streamChat` is
// exercised for real while the network call it makes is a test double.
const messagesStreamMock = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { stream: messagesStreamMock },
  })),
}));

process.env.ANTHROPIC_API_KEY = "test-key";

import { AnthropicChatModelClient, CONVERSATION_MODEL, EXTRACTION_MODEL } from "./anthropicClient";

describe("model tier split", () => {
  // 1.4 — the conversational and extraction calls are configured with
  // independent model values (chat-inference-cost-controls).
  it("configures the conversational and extraction calls with different model values", () => {
    expect(CONVERSATION_MODEL).not.toBe(EXTRACTION_MODEL);
  });
});

describe("AnthropicChatModelClient.streamChat", () => {
  beforeEach(() => {
    messagesStreamMock.mockReset();
    messagesStreamMock.mockReturnValue({});
  });

  it("calls the API with the conversational model", () => {
    const client = new AnthropicChatModelClient();

    client.streamChat({ systemPrompt: "system text", history: [], userMessage: "hi" });

    expect(messagesStreamMock).toHaveBeenCalledTimes(1);
    expect(messagesStreamMock.mock.calls[0][0].model).toBe(CONVERSATION_MODEL);
  });

  // 2.1 — a single cache_control breakpoint covers the whole composed
  // system prompt (master prompt + resume/LinkedIn context together).
  it("adds a single ephemeral cache_control breakpoint over the composed system prompt", () => {
    const client = new AnthropicChatModelClient();

    client.streamChat({ systemPrompt: "master prompt + resume context", history: [], userMessage: "hi" });

    const callArgs = messagesStreamMock.mock.calls[0][0];
    expect(callArgs.system).toEqual([
      {
        type: "text",
        text: "master prompt + resume context",
        cache_control: { type: "ephemeral" },
      },
    ]);
  });

  // 2.4 — two consecutive turns with unchanged resume context both
  // reference the same cache-eligible prompt content: Anthropic caches by
  // hashing the marked block's content, so sending byte-identical text on
  // both calls is what makes the second turn cache-eligible.
  it("sends identical cache-eligible content across turns when the composed system prompt is unchanged", () => {
    const client = new AnthropicChatModelClient();
    const systemPrompt = "master prompt + resume context, turn 1 and 2 identical";

    client.streamChat({ systemPrompt, history: [], userMessage: "first message" });
    client.streamChat({ systemPrompt, history: [], userMessage: "second message" });

    const firstSystem = messagesStreamMock.mock.calls[0][0].system;
    const secondSystem = messagesStreamMock.mock.calls[1][0].system;
    expect(firstSystem).toEqual(secondSystem);
  });

  // 2.5 — a turn following a resume-context update does not reuse the
  // stale cached block: the cached block's text differs, so Anthropic's
  // content-hash lookup naturally misses rather than serving stale data.
  it("sends different cache-block content after the composed system prompt changes", () => {
    const client = new AnthropicChatModelClient();

    client.streamChat({
      systemPrompt: "master prompt + resume context v1",
      history: [],
      userMessage: "first message",
    });
    client.streamChat({
      systemPrompt: "master prompt + resume context v2 (updated)",
      history: [],
      userMessage: "second message",
    });

    const firstText = messagesStreamMock.mock.calls[0][0].system[0].text;
    const secondText = messagesStreamMock.mock.calls[1][0].system[0].text;
    expect(firstText).not.toBe(secondText);
  });
});
