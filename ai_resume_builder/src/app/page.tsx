"use client";

import { useRouter } from "next/navigation";
import { useAuthSession } from "@/components/auth/AuthProvider";
import { ChatExperience } from "@/components/chat/ChatExperience";
import { LandingView } from "@/components/landing/LandingView";

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuthSession();

  if (loading) {
    return <div className="flex flex-1" />;
  }

  if (!user) {
    return <LandingView onStartChatting={() => router.push("/login")} />;
  }

  return <ChatExperience />;
}
