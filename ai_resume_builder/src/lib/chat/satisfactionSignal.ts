import { getAnthropicClient, CONVERSATION_MODEL } from "./anthropicClient";
import type { ChatTurnInput } from "./types";

/**
 * Classifies the just-completed turn for the satisfaction determination
 * (resume-optimization-strategy 3.14): did the user explicitly ask to
 * export/download, or did their reply indicate satisfaction/readiness in
 * response to a readiness question the assistant asked. Both paths are
 * "satisfied"; an explicit export ask additionally overrides the
 * readiness/satisfaction gate entirely (premium-download-gate 6.2), so it's
 * tracked as its own flag.
 */
export const SATISFACTION_SIGNAL_TOOL_NAME = "record_satisfaction_signal";

export const SATISFACTION_SIGNAL_TOOL = {
  name: SATISFACTION_SIGNAL_TOOL_NAME,
  description:
    "Records whether the user's latest message explicitly asked to export/download their resume, and/or indicated they are satisfied and ready in response to a readiness question the assistant asked.",
  input_schema: {
    type: "object" as const,
    properties: {
      explicitExportRequested: {
        type: "boolean",
        description:
          "True only if the user's latest message explicitly asks to export, download, or get their resume as a file (e.g. 'export it', 'send me the PDF', 'I want to download this now').",
      },
      satisfiedFromReadiness: {
        type: "boolean",
        description:
          "True only if the assistant's prior message asked the user a readiness/satisfaction question (e.g. 'does this look good to you now?') and the user's reply affirmatively indicates they're satisfied/ready.",
      },
    },
    required: ["explicitExportRequested", "satisfiedFromReadiness"],
  },
};

export interface SatisfactionSignal {
  explicitExportRequested: boolean;
  satisfiedFromReadiness: boolean;
}

function normalizeSignal(input: unknown): SatisfactionSignal | null {
  if (!input || typeof input !== "object") return null;
  const candidate = input as Record<string, unknown>;
  return {
    explicitExportRequested: Boolean(candidate.explicitExportRequested),
    satisfiedFromReadiness: Boolean(candidate.satisfiedFromReadiness),
  };
}

export interface SatisfactionSignalModelClient {
  /**
   * Classifies the just-completed turn (prior conversation ending in the
   * user's message and the assistant's reply). Returns null if Claude's
   * response didn't include a usable tool_use block.
   */
  deriveSatisfactionSignal(conversation: ChatTurnInput[]): Promise<SatisfactionSignal | null>;
}

export class AnthropicSatisfactionSignalModelClient implements SatisfactionSignalModelClient {
  async deriveSatisfactionSignal(
    conversation: ChatTurnInput[]
  ): Promise<SatisfactionSignal | null> {
    const client = getAnthropicClient();

    const message = await client.messages.create({
      model: CONVERSATION_MODEL,
      max_tokens: 512,
      tools: [SATISFACTION_SIGNAL_TOOL],
      tool_choice: { type: "tool", name: SATISFACTION_SIGNAL_TOOL_NAME },
      messages: [
        ...conversation.map((turn) => ({ role: turn.role, content: turn.content })),
        {
          role: "user" as const,
          content: `Call the ${SATISFACTION_SIGNAL_TOOL_NAME} tool now, classifying only the most recent user message and the assistant message immediately before it.`,
        },
      ],
    });

    const toolUse = message.content.find((block) => block.type === "tool_use") as
      | { type: "tool_use"; input: unknown }
      | undefined;

    return toolUse ? normalizeSignal(toolUse.input) : null;
  }
}
