import { getAnthropicClient, CHAT_MODEL } from "./anthropicClient";
import type { ChatTurnInput } from "./types";
import type { ResumeDraft } from "@/types/resume";

/**
 * Fixed tool schema (1.1) for Claude's structured-output/tool-use
 * extraction call. Mirrors `ResumeDraft` 1:1 so the persisted
 * `structured_output` can be read back directly as a `ResumeDraft` by the
 * frontend, with no translation layer.
 */
export const RESUME_EXTRACTION_TOOL_NAME = "record_resume_fields";

export const RESUME_EXTRACTION_TOOL = {
  name: RESUME_EXTRACTION_TOOL_NAME,
  description:
    "Records the resume-relevant fields extracted from the conversation so far. Call this with the best current understanding of the user's resume, using empty strings/arrays for fields not yet known from the conversation.",
  input_schema: {
    type: "object" as const,
    properties: {
      name: { type: "string", description: "The user's full name" },
      title: { type: "string", description: "The user's target job title or role" },
      summary: { type: "string", description: "A short professional summary" },
      experience: {
        type: "array",
        description: "Work experience entries, most recent first",
        items: {
          type: "object",
          properties: {
            company: { type: "string" },
            role: { type: "string" },
            description: { type: "string" },
          },
          required: ["company", "role", "description"],
        },
      },
    },
    required: ["name", "title", "summary", "experience"],
  },
};

function normalizeExtractedResume(input: unknown): ResumeDraft {
  const candidate = (input ?? {}) as Record<string, unknown>;

  const experience = Array.isArray(candidate.experience)
    ? candidate.experience
        .filter((entry): entry is Record<string, unknown> => typeof entry === "object" && entry !== null)
        .map((entry) => ({
          company: typeof entry.company === "string" ? entry.company : "",
          role: typeof entry.role === "string" ? entry.role : "",
          description: typeof entry.description === "string" ? entry.description : "",
        }))
    : [];

  return {
    name: typeof candidate.name === "string" ? candidate.name : "",
    title: typeof candidate.title === "string" ? candidate.title : "",
    summary: typeof candidate.summary === "string" ? candidate.summary : "",
    experience,
  };
}

export interface ResumeExtractionModelClient {
  /**
   * Non-streaming tool-use call that derives structured resume data from
   * the full conversation (1.2). Returns null if Claude's response didn't
   * include a usable tool_use block — callers treat that the same as any
   * other extraction failure (1.4), never as a special case that surfaces
   * to the user.
   */
  extractResume(conversation: ChatTurnInput[]): Promise<ResumeDraft | null>;
}

export class AnthropicResumeExtractionModelClient implements ResumeExtractionModelClient {
  async extractResume(conversation: ChatTurnInput[]): Promise<ResumeDraft | null> {
    const client = getAnthropicClient();

    const message = await client.messages.create({
      model: CHAT_MODEL,
      max_tokens: 2048,
      tools: [RESUME_EXTRACTION_TOOL],
      tool_choice: { type: "tool", name: RESUME_EXTRACTION_TOOL_NAME },
      messages: conversation.map((turn) => ({ role: turn.role, content: turn.content })),
    });

    const toolUse = message.content.find((block) => block.type === "tool_use") as
      | { type: "tool_use"; input: unknown }
      | undefined;

    if (!toolUse) {
      return null;
    }

    return normalizeExtractedResume(toolUse.input);
  }
}
