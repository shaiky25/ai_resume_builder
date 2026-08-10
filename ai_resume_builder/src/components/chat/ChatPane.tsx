import type { ChatMessage } from "@/types/chat";
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
}: ChatPaneProps) {
  return (
    <section className="flex h-full flex-1 flex-col border-r border-zinc-200 dark:border-zinc-800">
      <MessageList messages={messages} />
      <ChatInput
        disabled={isStreaming}
        onSend={onSend}
        isAudioInput={isAudioInput}
        onToggleAudioInput={onToggleAudioInput}
        isRecording={isRecording}
        onStartRecording={onStartRecording}
        onStopRecording={onStopRecording}
      />
    </section>
  );
}
