import { useEffect, useRef } from "react";
import type { ChatMessage } from "@/types/chat";
import { formatInlineMarkdown } from "@/lib/chat/formatInlineMarkdown";

interface MessageListProps {
  messages: ChatMessage[];
  isStreaming: boolean;
}

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});

function Avatar({ role }: { role: ChatMessage["role"] }) {
  return (
    <div
      aria-hidden="true"
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
        role === "user"
          ? "bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900"
          : "bg-gradient-to-br from-indigo-500 to-purple-500 text-white"
      }`}
    >
      {role === "user" ? "You" : "AI"}
    </div>
  );
}

function ThinkingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="flex items-end gap-2">
        <Avatar role="assistant" />
        <div className="flex items-center gap-1 rounded-2xl bg-zinc-100 px-4 py-3 dark:bg-zinc-800">
          <span
            className="animate-thinking-dot h-1.5 w-1.5 rounded-full bg-zinc-500 dark:bg-zinc-400"
            style={{ animationDelay: "0ms" }}
          />
          <span
            className="animate-thinking-dot h-1.5 w-1.5 rounded-full bg-zinc-500 dark:bg-zinc-400"
            style={{ animationDelay: "150ms" }}
          />
          <span
            className="animate-thinking-dot h-1.5 w-1.5 rounded-full bg-zinc-500 dark:bg-zinc-400"
            style={{ animationDelay: "300ms" }}
          />
        </div>
      </div>
    </div>
  );
}

export function MessageList({ messages, isStreaming }: MessageListProps) {
  const lastMessage = messages[messages.length - 1];
  const showThinkingIndicator = isStreaming && lastMessage?.role === "user";
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages, showThinkingIndicator]);

  return (
    <div
      role="log"
      aria-live="polite"
      className="relative flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4"
    >
      {messages.map((message) => (
        <div
          key={message.id}
          className={`animate-message-entry flex items-end gap-2 ${
            message.role === "user" ? "flex-row-reverse justify-start" : "justify-start"
          }`}
        >
          <Avatar role={message.role} />
          <div
            className={`flex max-w-[75%] flex-col gap-1 ${
              message.role === "user" ? "items-end" : "items-start"
            }`}
          >
            <div
              className={`rounded-2xl px-4 py-2 text-sm leading-6 whitespace-pre-wrap ${
                message.role === "user"
                  ? "bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900"
                  : "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
              }`}
            >
              {formatInlineMarkdown(message.text)}
            </div>
            <span className="px-1 text-xs text-zinc-400 dark:text-zinc-500">
              {timeFormatter.format(message.createdAt)}
            </span>
          </div>
        </div>
      ))}
      {showThinkingIndicator && <ThinkingIndicator />}
      <div ref={bottomRef} />
    </div>
  );
}
