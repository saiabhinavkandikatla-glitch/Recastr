import { AppShell } from "@/components/layout/AppShell";
import { getCurrentUser } from "@/lib/current-user";
import {
  Bot,
  Send,
  Lightbulb,
  TrendingUp,
  Repeat,
  PenLine,
} from "lucide-react";

export default async function AssistantPage() {
  const user = await getCurrentUser();

  return (
    <AppShell projects={[]} title="AI Assistant" user={user}>
      <div className="flex h-[calc(100vh-8rem)] flex-col">
        {/* Chat area */}
        <div className="flex flex-1 flex-col items-center justify-center px-4">
          {/* Avatar */}
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1A1A1A] ring-1 ring-[#232323]">
            <Bot className="h-7 w-7 text-white" />
          </span>

          {/* Welcome */}
          <h1 className="mt-6 text-xl font-bold text-white">
            AI Content Assistant
          </h1>
          <p className="mt-2 max-w-lg text-center text-sm text-[#8A8A8A]">
            Hi! I&apos;m your AI content assistant. Ask me anything about
            content strategy, repurposing, or social media growth.
          </p>

          {/* Suggestion Cards */}
          <div className="mt-8 grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
            <SuggestionCard
              icon={Lightbulb}
              title="Content Ideas"
              description="Generate fresh content ideas for my niche"
            />
            <SuggestionCard
              icon={TrendingUp}
              title="Growth Strategy"
              description="How can I grow my audience on LinkedIn?"
            />
            <SuggestionCard
              icon={Repeat}
              title="Repurposing"
              description="Turn my latest YouTube video into Twitter threads"
            />
            <SuggestionCard
              icon={PenLine}
              title="Writing Help"
              description="Improve my hook for better engagement"
            />
          </div>
        </div>

        {/* Input bar – pinned to bottom */}
        <div className="border-t border-[#232323] bg-[#090909] px-4 pb-4 pt-4">
          <div className="mx-auto flex max-w-2xl items-center gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Ask the assistant anything…"
                className="w-full rounded-xl border border-[#232323] bg-[#0F0F0F] px-4 py-3 pr-12 text-sm text-white placeholder-[#555] outline-none transition-colors focus:border-[#444]"
                readOnly
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg bg-white text-black transition-opacity hover:opacity-90"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
          <p className="mt-2 text-center text-[10px] text-[#555]">
            AI can make mistakes. Verify important information.
          </p>
        </div>
      </div>
    </AppShell>
  );
}

/* ── Suggestion Card ──────────────────────────────────────────── */

function SuggestionCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      className="flex items-start gap-3 rounded-2xl border border-[#232323] bg-[#0F0F0F] p-4 text-left transition-colors hover:border-[#333] hover:bg-[#151515]"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#1A1A1A]">
        <Icon className="h-4 w-4 text-[#8A8A8A]" />
      </span>
      <div>
        <p className="text-sm font-medium text-white">{title}</p>
        <p className="mt-0.5 text-xs text-[#8A8A8A]">{description}</p>
      </div>
    </button>
  );
}
