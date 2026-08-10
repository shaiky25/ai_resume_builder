import type { ChatMessage } from "@/types/chat";

interface MessageListProps {
  messages: ChatMessage[];
}

export function MessageList({ messages }: MessageListProps) {
  return (
    <div
      role="log"
      aria-live="polite"
      className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4"
    >
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${
            message.role === "user" ? "justify-end" : "justify-start"
          }`}
        >
          <div
            className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm leading-6 whitespace-pre-wrap ${
              message.role === "user"
                ? "bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900"
                : "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
            }`}
          >
            {message.text}
          </div>
        </div>
      ))}
    </div>
  );
}
