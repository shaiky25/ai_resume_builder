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
  /** Persona-voiced chip copy (chat-input-affordances); empty hides the row. */
  suggestedPrompts: string[];
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
  suggestedPrompts,
}: ChatPaneProps) {
  // The static persona greeting is an assistant message, not a user one — it
  // never counts toward "the visitor has sent a message" for chip visibility
  // (chat-input-affordances).
  const hasUserMessage = messages.some((message) => message.role === "user");

  return (
    <section className="relative flex h-full flex-1 flex-col overflow-hidden border-r border-zinc-200 dark:border-zinc-800">
      <div
        aria-hidden="true"
        className="animate-ambient-drift pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-indigo-950/40 dark:via-zinc-900 dark:to-purple-950/40"
      />

      <div className="relative flex flex-1 flex-col overflow-hidden">
        <MessageList messages={messages} isStreaming={isStreaming} />

        {!hasUserMessage && suggestedPrompts.length > 0 && (
          <div className="animate-message-entry flex flex-wrap justify-center gap-2 px-4 pb-3">
            {suggestedPrompts.map((prompt) => (
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
