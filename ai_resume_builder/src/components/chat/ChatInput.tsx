"use client";

import { useState, type FormEvent } from "react";

interface ChatInputProps {
  disabled: boolean;
  onSend: (text: string) => void;
  isAudioInput: boolean;
  onToggleAudioInput: () => void;
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
}

export function ChatInput({
  disabled,
  onSend,
  isAudioInput,
  onToggleAudioInput,
  isRecording,
  onStartRecording,
  onStopRecording,
}: ChatInputProps) {
  const [value, setValue] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    setValue("");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 border-t border-zinc-200 px-4 py-3 dark:border-zinc-800"
    >
      <button
        type="button"
        onClick={onToggleAudioInput}
        aria-pressed={isAudioInput}
        title={isAudioInput ? "Switch to text input" : "Switch to voice input"}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm transition-colors ${
          isAudioInput
            ? "border-zinc-900 bg-zinc-900 text-zinc-50 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
            : "border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        }`}
      >
        🎤
      </button>

      {isAudioInput ? (
        <button
          type="button"
          onClick={isRecording ? onStopRecording : onStartRecording}
          disabled={disabled}
          className="flex-1 rounded-full border border-zinc-300 px-4 py-2 text-left text-sm text-zinc-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300"
        >
          {isRecording ? "Recording… tap to stop" : "Tap to start recording"}
        </button>
      ) : (
        <input
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          disabled={disabled}
          placeholder="Message your career coach…"
          className="flex-1 rounded-full border border-zinc-300 px-4 py-2 text-sm text-zinc-900 outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-50"
        />
      )}

      {!isAudioInput && (
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          className="shrink-0 rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          Send
        </button>
      )}
    </form>
  );
}
