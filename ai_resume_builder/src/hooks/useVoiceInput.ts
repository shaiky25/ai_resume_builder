"use client";

import { useCallback, useRef, useState } from "react";

export interface UseVoiceInputResult {
  isRecording: boolean;
  transcript: string;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

/**
 * Stub only: no real audio capture or transcription provider is wired in
 * yet. A later change drops react-media-recorder -> Whisper/AssemblyAI
 * behind this same interface (start/stop/transcript) without touching
 * call sites.
 *
 * `onTranscriptReady` is invoked from stop() with whatever transcript is
 * available — the same call site a real provider will use once it can
 * actually populate `transcript`, so the chat send path never needs to
 * change.
 */
export function useVoiceInput(
  onTranscriptReady: (text: string) => void,
): UseVoiceInputResult {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const transcriptRef = useRef("");

  const start = useCallback(() => {
    transcriptRef.current = "";
    setTranscript("");
    setIsRecording(true);
  }, []);

  const stop = useCallback(() => {
    setIsRecording(false);
    const text = transcriptRef.current.trim();
    if (text) {
      onTranscriptReady(text);
    }
    // Stub: transcriptRef never actually gets populated without a real
    // recording/transcription provider, so this is a no-op today.
  }, [onTranscriptReady]);

  const reset = useCallback(() => {
    transcriptRef.current = "";
    setTranscript("");
  }, []);

  return { isRecording, transcript, start, stop, reset };
}
