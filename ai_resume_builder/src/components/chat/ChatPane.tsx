import type { ChatMessage, ChatStreamError } from "@/types/chat";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";

interface ChatPaneProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  onSend: (text: string) => void;
  isAudioInput: boolean;
  onToggleAudioInput: () => void;
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  chatError: ChatStreamError | null;
}

const SUGGESTED_PROMPTS = [
  "Help me describe my last role",
  "What makes a resume stand out?",
  "Draft a professional summary for me",
  "How should I list my skills?",
];

function EmptyStateIllustration() {
  return (
    <svg
      viewBox="0 0 120 120"
      role="img"
      aria-label="Illustration of a chat bubble with a sparkle, representing your AI career coach"
      className="h-24 w-24 text-zinc-300 dark:text-zinc-700"
    >
      <path
        d="M20 30a10 10 0 0 1 10-10h60a10 10 0 0 1 10 10v40a10 10 0 0 1-10 10H48l-16 14V80H30a10 10 0 0 1-10-10z"
        fill="currentColor"
      />
      <path
        d="M84 16l3.2 7.8L95 27l-7.8 3.2L84 38l-3.2-7.8L73 27l7.8-3.2z"
        className="fill-indigo-400 dark:fill-indigo-500"
      />
    </svg>
  );
}

export function ChatPane({
  messages,
  isStreaming,
  onSend,
  isAudioInput,
  onToggleAudioInput,
  isRecording,
  onStartRecording,
  onStopRecording,
  chatError,
}: ChatPaneProps) {
  const isEmpty = messages.length === 0;

  return (
    <section className="relative flex h-full flex-1 flex-col overflow-hidden border-r border-zinc-200 dark:border-zinc-800">
      <div
        aria-hidden="true"
        className="animate-ambient-drift pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-indigo-950/40 dark:via-zinc-900 dark:to-purple-950/40"
      />

      <div className="relative flex flex-1 flex-col overflow-hidden">
        {isEmpty ? (
          <div className="animate-message-entry flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <EmptyStateIllustration />
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Let&apos;s build your resume
            </h1>
            <p className="max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
              Tell your AI career coach about your experience, or try one of these to get started.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => onSend(prompt)}
                  className="rounded-full border border-zinc-300 bg-white/80 px-3 py-1.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <MessageList messages={messages} isStreaming={isStreaming} />
        )}

        <div className="flex flex-col gap-1 border-t border-zinc-200 bg-white/70 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/70">
          {chatError && (
            <div
              role="alert"
              className="mx-4 mt-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
            >
              {chatError.message}
            </div>
          )}
          <ChatInput
            disabled={isStreaming}
            onSend={onSend}
            isAudioInput={isAudioInput}
            onToggleAudioInput={onToggleAudioInput}
            isRecording={isRecording}
            onStartRecording={onStartRecording}
            onStopRecording={onStopRecording}
          />
          {!isAudioInput && (
            <p className="px-4 pb-2 text-xs text-zinc-400 dark:text-zinc-500">
              Enter to send · Shift+Enter for a new line
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
