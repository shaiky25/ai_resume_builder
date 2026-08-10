import { randomUUID } from "crypto";
import { verifyRequestUser, type AuthenticatedUser } from "@/lib/supabase/serverClient";
import { composeSystemPrompt } from "./promptComposer";
import { SupabaseCreditsGateway, type CreditsGateway, type ReserveResult } from "./credits";
import {
  SupabaseResumeContextGateway,
  type ResumeContext,
  type ResumeContextGateway,
} from "./resumeContext";
import { SupabaseUsageLogger, type UsageLogger } from "./usageLogger";
import { AnthropicChatModelClient, type ChatModelClient, type ChatStream } from "./anthropicClient";
import { chatRateLimiter, type RateLimiter } from "./rateLimiter";
import type { ChatApiRequestBody, ChatTurnInput } from "./types";

/** Flat per-request credit cost. One chat message costs one credit. */
export const CHAT_CREDIT_COST = 1;

export interface ChatRequestDependencies {
  verifyUser: (authHeader: string | null) => Promise<AuthenticatedUser | null>;
  rateLimiter: RateLimiter;
  creditsGateway: CreditsGateway;
  resumeContextGateway: ResumeContextGateway;
  usageLogger: UsageLogger;
  modelClient: ChatModelClient;
  generateRequestId: () => string;
}

export function createDefaultDependencies(): ChatRequestDependencies {
  return {
    verifyUser: verifyRequestUser,
    rateLimiter: chatRateLimiter,
    creditsGateway: new SupabaseCreditsGateway(),
    resumeContextGateway: new SupabaseResumeContextGateway(),
    usageLogger: new SupabaseUsageLogger(),
    modelClient: new AnthropicChatModelClient(),
    generateRequestId: () => randomUUID(),
  };
}

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function isValidHistoryTurn(value: unknown): value is ChatTurnInput {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    (candidate.role === "user" || candidate.role === "assistant") &&
    typeof candidate.content === "string"
  );
}

/**
 * The full POST /api/chat request pipeline, in the order required by
 * design.md: auth (unconditionally first) -> rate limit -> credit gate ->
 * atomic reserve -> resume context fetch -> prompt composition -> Claude
 * stream -> usage logging / refund.
 *
 * Dependencies are injected (with production defaults) so the pipeline can
 * be exercised in tests without a real Supabase or Anthropic client.
 */
export async function handleChatRequest(
  request: Request,
  deps: ChatRequestDependencies = createDefaultDependencies()
): Promise<Response> {
  // 1. Authentication — verified before any other logic runs. Missing/invalid
  // JWT short-circuits here; no rate limit check, no credit check, no Claude call.
  const authHeader = request.headers.get("authorization");
  const user = await deps.verifyUser(authHeader);
  if (!user) {
    return jsonResponse(401, { error: "unauthenticated" });
  }

  // 2. Rate limit — independent of credit balance, gates before the credit
  // check or any Claude call.
  if (!deps.rateLimiter.check(user.id)) {
    return jsonResponse(429, { error: "rate_limited" });
  }

  let body: ChatApiRequestBody;
  try {
    body = (await request.json()) as ChatApiRequestBody;
  } catch {
    return jsonResponse(400, {
      error: "invalid_request",
      message: "Request body must be valid JSON",
    });
  }

  if (!body || typeof body.message !== "string" || body.message.trim().length === 0) {
    return jsonResponse(400, {
      error: "invalid_request",
      message: "`message` is required",
    });
  }

  const history: ChatTurnInput[] = Array.isArray(body.history)
    ? body.history.filter(isValidHistoryTurn)
    : [];

  // 3. Hard credit gate — read balance; insufficient balance short-circuits
  // with a distinguishable 403, no Claude call, no balance mutation.
  let creditsRemaining: number | null;
  try {
    creditsRemaining = await deps.creditsGateway.getCreditsRemaining(user.id);
  } catch (err) {
    console.error("Failed to read credit balance", err);
    return jsonResponse(500, { error: "internal_error" });
  }

  if (creditsRemaining === null || creditsRemaining < CHAT_CREDIT_COST) {
    return jsonResponse(403, {
      error: "out_of_credits",
      creditsRemaining: creditsRemaining ?? 0,
    });
  }

  // 4. Atomic reserve/decrement BEFORE opening the Claude stream. This is
  // the race-safe gate: two concurrent requests both passing the read above
  // can still only have one succeed here.
  const requestId = deps.generateRequestId();
  let reserveResult: ReserveResult;
  try {
    reserveResult = await deps.creditsGateway.reserve(user.id, requestId, CHAT_CREDIT_COST);
  } catch (err) {
    console.error("reserve_chat_credit failed", err);
    return jsonResponse(500, { error: "internal_error" });
  }

  if (!reserveResult.success) {
    // Lost the race (or balance changed between the read and the atomic
    // reserve) — treated identically to the insufficient-balance case.
    return jsonResponse(403, {
      error: "out_of_credits",
      creditsRemaining: reserveResult.newBalance,
    });
  }

  // From here on a credit has been reserved. Every exit path below must
  // refund it exactly once on failure. `refunded` guards against
  // double-refunding from both an explicit error branch and the stream's
  // cancel() callback firing for the same request.
  let refunded = false;
  const refund = async (reason: string) => {
    if (refunded) return;
    refunded = true;
    await deps.creditsGateway.refund(user.id, requestId, CHAT_CREDIT_COST, reason);
  };

  // 5. Fetch resume/LinkedIn context server-side, scoped to this user —
  // never trust the client's request body for this.
  let resumeContext: ResumeContext | null;
  try {
    resumeContext = await deps.resumeContextGateway.getLatestResumeContext(user.id);
  } catch (err) {
    console.error("Failed to fetch resume context", err);
    await refund("context_fetch_failed");
    return jsonResponse(500, { error: "internal_error" });
  }

  // 6. Compose the Master Prompt + context immediately before the Claude call.
  const systemPrompt = composeSystemPrompt(resumeContext);

  // 7. Open the Claude stream.
  let chatStream: ChatStream;
  try {
    chatStream = deps.modelClient.streamChat({
      systemPrompt,
      history,
      userMessage: body.message,
    });
  } catch (err) {
    console.error("Failed to open Claude stream", err);
    await refund("claude_call_error");
    return jsonResponse(502, { error: "claude_error" });
  }

  // 8. Proxy the stream to the client as SSE. Clean completion emits
  // `event: done`; a Claude-side error emits `event: error` and refunds; a
  // dropped client connection is caught by the ReadableStream's cancel()
  // callback (invoked by the runtime when the client disconnects), which
  // also refunds. Neither the response body nor any error payload here ever
  // includes `systemPrompt`/the Master Prompt text.
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of chatStream.events) {
          if (event.type === "text_delta" && event.text) {
            controller.enqueue(
              encoder.encode(
                `event: message\ndata: ${JSON.stringify({ text: event.text })}\n\n`
              )
            );
          }
        }

        const usage = await chatStream.finalUsage();

        await deps.usageLogger.logSuccess({
          userId: user.id,
          requestId,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
        });

        controller.enqueue(encoder.encode(`event: done\ndata: {}\n\n`));
        controller.close();
      } catch (err) {
        console.error("Claude stream failed", err);
        await refund("claude_stream_error");
        try {
          controller.enqueue(
            encoder.encode(
              `event: error\ndata: ${JSON.stringify({ error: "stream_error" })}\n\n`
            )
          );
          controller.close();
        } catch {
          // Controller may already be closed/errored if the client
          // disconnected concurrently — nothing more to do.
        }
      }
    },
    async cancel() {
      // Client dropped the connection mid-stream.
      await refund("client_disconnected");
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
