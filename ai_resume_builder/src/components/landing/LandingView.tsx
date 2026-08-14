"use client";

interface LandingViewProps {
  onStartChatting: () => void;
}

export function LandingView({ onStartChatting }: LandingViewProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-4 text-center">
      <div className="max-w-lg space-y-3">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Turn a conversation into a resume
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Chat with your career coach about your experience, and watch a
          polished resume take shape alongside the conversation.
        </p>
      </div>

      {/* Placeholder for the product-walkthrough GIF — asset TBD, see
          openspec/changes/login-signup-ui/design.md Open Questions. */}
      <div className="flex h-64 w-full max-w-lg items-center justify-center rounded-lg border border-dashed border-zinc-300 text-sm text-zinc-400 dark:border-zinc-700 dark:text-zinc-500">
        Product walkthrough coming soon
      </div>

      <button
        type="button"
        onClick={onStartChatting}
        className="rounded-full bg-zinc-900 px-6 py-2 text-sm font-medium text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        Start chatting
      </button>
    </div>
  );
}
