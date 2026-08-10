"use client";

import { useCallback, useRef, useState } from "react";
import { ChatPane } from "@/components/chat/ChatPane";
import { PreviewPane } from "@/components/preview/PreviewPane";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import type { ChatMessage } from "@/types/chat";
import { emptyResumeDraft, type ResumeDraft } from "@/types/resume";

const MOCK_ASSISTANT_REPLY =
  "Got it — I've noted that for your resume. Tell me more about your most recent role.";

const MOCK_RESUME_DRAFT: ResumeDraft = {
  name: "Jordan Rivera",
  title: "Senior Backend Engineer",
  summary:
    "Backend engineer with 8+ years building high-throughput distributed systems in Python and Go.",
  experience: [
    {
      company: "Acme Corp",
      role: "Senior Backend Engineer",
      description:
        "Led migration of the payments pipeline to an event-driven architecture, cutting p99 latency by 40%.",
    },
  ],
};

/** How many user turns before the mocked backend "has enough" for a preview. */
const READY_AFTER_USER_TURNS = 2;

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isAudioInput, setIsAudioInput] = useState(false);
  const [resumeDraft, setResumeDraft] = useState<ResumeDraft>(emptyResumeDraft);
  const [isResumeReady, setIsResumeReady] = useState(false);
  const userTurnCount = useRef(0);

  // Single send path (proposal.md / design.md): typed text and
  // voice-transcribed text both normalize to plain text before calling this.
  // No branching downstream of input capture based on where the text came from.
  const sendMessage = useCallback((text: string) => {
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      text,
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsStreaming(true);

    userTurnCount.current += 1;

    // Mocked streaming response: the real /api/chat contract (resume_patch
    // stream events) is a Backend & Security layer dependency, out of scope
    // here. This stands in so the disabled-while-streaming behavior and the
    // preview's blur/reveal transition are exercisable without a backend.
    window.setTimeout(() => {
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        text: MOCK_ASSISTANT_REPLY,
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsStreaming(false);

      if (userTurnCount.current >= READY_AFTER_USER_TURNS) {
        setResumeDraft(MOCK_RESUME_DRAFT);
        setIsResumeReady(true);
      }
    }, 900);
  }, []);

  // Voice-transcribed text feeds the exact same sendMessage() path as typed
  // text: the hook calls this callback once transcription is ready, no
  // branching downstream of input capture.
  const voice = useVoiceInput(sendMessage);

  return (
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
      />
      <PreviewPane resumeDraft={resumeDraft} isResumeReady={isResumeReady} />
    </div>
  );
}
