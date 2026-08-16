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
    "Records the resume-relevant fields extracted from the conversation so far. Rewrite and organize what the user said into proper resume language — never copy the user's raw chat text verbatim into a field. If a field genuinely isn't known yet from the conversation, use an empty string or empty array for it; never use a placeholder word like 'unknown' or 'N/A'. If the assistant proposed tailoring/rewrite changes in the conversation, only fold them into these fields once the user has explicitly agreed to apply them — a proposal the user hasn't yet confirmed must not change these fields (resume-optimization-strategy: confirm-before-apply).",
  input_schema: {
    type: "object" as const,
    properties: {
      name: { type: "string", description: "The user's full name, exactly as they stated it. Empty string if not yet mentioned." },
      title: { type: "string", description: "The user's target job title or role, phrased as a resume headline. Empty string if not yet known." },
      summary: {
        type: "string",
        description:
          "A short, polished professional summary written in resume style (concise, third-person-omitted, achievement-oriented) — a rewrite, not a copy of anything the user typed.",
      },
      experience: {
        type: "array",
        description: "Work experience entries, most recent first, written in resume style.",
        items: {
          type: "object",
          properties: {
            company: { type: "string" },
            role: { type: "string" },
            description: {
              type: "string",
              description:
                "A concise, resume-style rewrite of the responsibilities/impact for this role — not a verbatim copy of the user's chat message.",
            },
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
      // `conversation` ends with the assistant's just-generated reply, but
      // the API rejects a message list that doesn't end in a user turn
      // (no assistant-message prefill support). Append a trailing user
      // instruction so the list is valid regardless of what the last turn
      // in `conversation` is.
      messages: [
        ...conversation.map((turn) => ({ role: turn.role, content: turn.content })),
        {
          role: "user" as const,
          content:
            "Call the record_resume_fields tool now. Rewrite what's known into proper resume language rather than copying my messages verbatim, and leave any field you don't have real information for as empty rather than guessing a placeholder.",
        },
      ],
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
