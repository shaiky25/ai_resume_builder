"use client";

import { useCallback, useState } from "react";
import { ChatPane } from "@/components/chat/ChatPane";
import { PreviewPane } from "@/components/preview/PreviewPane";
import { useAuthSession } from "@/components/auth/AuthProvider";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { useResumeDraft } from "@/hooks/useResumeDraft";
import { usePremiumDownloadAccess } from "@/hooks/usePremiumDownloadAccess";
import { getBrowserClient } from "@/lib/supabase/browserClient";
import { streamChatMessage } from "@/lib/chat/chatClient";
import type { ChatMessage, ChatStreamError } from "@/types/chat";

export function ChatExperience() {
  const { user, session } = useAuthSession();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isAudioInput, setIsAudioInput] = useState(false);
  const [chatError, setChatError] = useState<ChatStreamError | null>(null);

  const { resumeDraft, isResumeReady } = useResumeDraft(user?.id ?? null);
  const hasPremiumDownloadAccess = usePremiumDownloadAccess(user?.id ?? null);

  // Single send path (proposal.md / design.md): typed text and
  // voice-transcribed text both normalize to plain text before calling this.
  // No branching downstream of input capture based on where the text came from.
  const sendMessage = useCallback(
    (text: string) => {
      const accessToken = session?.access_token;
      if (!accessToken) return;

      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        text,
        createdAt: Date.now(),
      };
      const assistantMessageId = crypto.randomUUID();
      // Snapshot the prior turns as the `history` sent alongside `message` —
      // matches the /api/chat contract, which expects prior turns separate
      // from the current user message.
      const history = messages.map((message) => ({
        role: message.role,
        content: message.text,
      }));

      setChatError(null);
      setMessages((prev) => [...prev, userMessage]);
      setIsStreaming(true);

      let assistantStarted = false;

      streamChatMessage({
        accessToken,
        message: text,
        history,
        onDelta: (delta) => {
          setMessages((prev) => {
            if (!assistantStarted) {
              assistantStarted = true;
              return [
                ...prev,
                { id: assistantMessageId, role: "assistant", text: delta, createdAt: Date.now() },
              ];
            }
            return prev.map((message) =>
              message.id === assistantMessageId
                ? { ...message, text: message.text + delta }
                : message
            );
          });
        },
        onDone: () => {
          setIsStreaming(false);
        },
        onError: (error) => {
          setIsStreaming(false);
          setChatError(error);
          // A stream that errors mid-response must never present its
          // partial text as a complete, successful reply.
          if (assistantStarted) {
            setMessages((prev) => prev.filter((message) => message.id !== assistantMessageId));
          }
        },
      });
    },
    [messages, session]
  );

  // Voice-transcribed text feeds the exact same sendMessage() path as typed
  // text: the hook calls this callback once transcription is ready, no
  // branching downstream of input capture.
  const voice = useVoiceInput(sendMessage);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-4 py-2 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
        <span className="font-medium text-zinc-900 dark:text-zinc-50">AI Resume Builder</span>
        <div className="flex items-center gap-3">
          <span>{user?.email}</span>
        <button
          type="button"
          onClick={() => getBrowserClient().auth.signOut()}
          className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-800"
        >
          Sign out
        </button>
        </div>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <ChatPane
          messages={messages}
          isStreaming={isStreaming}
          onSend={sendMessage}
          isAudioInput={isAudioInput}
          onToggleAudioInput={() => setIsAudioInput((prev) => !prev)}
          isRecording={voice.isRecording}
          onStartRecording={voice.start}
          onStopRecording={voice.stop}
          chatError={chatError}
        />
        <PreviewPane
          resumeDraft={resumeDraft}
          isResumeReady={isResumeReady}
          hasPremiumDownloadAccess={hasPremiumDownloadAccess}
          accessToken={session?.access_token ?? ""}
        />
      </div>
    </div>
  );
}
