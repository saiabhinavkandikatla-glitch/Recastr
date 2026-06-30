import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { getCurrentUser } from "@/lib/current-user";
import { AssistantChat } from "@/components/assistant/AssistantChat";

export const metadata: Metadata = {
  title: "AI Assistant",
  description: "Chat with your AI content assistant. Get writing ideas, improve drafts, brainstorm angles, and refine your social posts with AI guidance.",
  openGraph: {
    title: "AI Assistant | Recastr",
    description: "Chat with your AI content assistant to improve drafts and brainstorm social post angles.",
  },
  twitter: {
    title: "AI Assistant | Recastr",
    description: "Chat with your AI content assistant to improve drafts and brainstorm social post angles.",
  },
};

export default async function AssistantPage() {
  const user = await getCurrentUser();

  return (
    <AppShell projects={[]} title="AI Assistant" user={user}>
      <AssistantChat />
    </AppShell>
  );
}
