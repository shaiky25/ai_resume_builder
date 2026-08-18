"use client";

import { useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from "react";

interface ChatInputProps {
  disabled: boolean;
  onSend: (text: string) => void;
  isAudioInput: boolean;
  onToggleAudioInput: () => void;
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  /** resume-pdf-upload 3.1: upload a PDF as an alternative to pasting text. */
  onUploadResumePdf: (file: File) => void;
  isUploadingResume: boolean;
}

const MAX_TEXTAREA_HEIGHT_PX = 160;

export function ChatInput({
  disabled,
  onSend,
  isAudioInput,
  onToggleAudioInput,
  isRecording,
  onStartRecording,
  onStopRecording,
  onUploadResumePdf,
  isUploadingResume,
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resizeTextarea = (element: HTMLTextAreaElement) => {
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, MAX_TEXTAREA_HEIGHT_PX)}px`;
  };

  const submitMessage = () => {
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitMessage();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submitMessage();
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) {
      onUploadResumePdf(file);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-end gap-2 px-4 py-3"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        onChange={handleFileChange}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || isUploadingResume}
        title="Upload resume PDF"
        aria-label="Upload resume PDF"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-300 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        {isUploadingResume ? "…" : "📎"}
      </button>
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
          className={`flex flex-1 items-center gap-2 rounded-full border px-4 py-2 text-left text-sm text-zinc-600 disabled:cursor-not-allowed disabled:opacity-50 dark:text-zinc-300 ${
            isRecording
              ? "animate-recording-pulse border-red-400 dark:border-red-500"
              : "border-zinc-300 dark:border-zinc-700"
          }`}
        >
          {isRecording && (
            <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" aria-hidden="true" />
          )}
          {isRecording ? "Recording… tap to stop" : "Tap to start recording"}
        </button>
      ) : (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            resizeTextarea(event.target);
          }}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          rows={1}
          placeholder="Message your career coach…"
          className="max-h-40 flex-1 resize-none overflow-y-auto rounded-2xl border border-zinc-300 px-4 py-2 text-sm text-zinc-900 outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-50"
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
