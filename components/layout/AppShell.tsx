"use client";

import { useState } from "react";
import { CreditUpgradeModal } from "@/components/billing/CreditUpgradeModal";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { CommandPalette } from "@/components/layout/CommandPalette";
import type { CurrentUser } from "@/lib/current-user";
import type { Project } from "@/lib/types";

export function AppShell({
  children,
  projects,
  title = "Workspace",
  sourceBadge,
  user,
}: {
  children: React.ReactNode;
  projects: Project[];
  title?: string;
  sourceBadge?: string;
  user?: CurrentUser | null;
}) {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground aurora-bg">
      <Sidebar projects={projects} user={user} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden relative z-10">
        <TopBar
          title={title}
          sourceBadge={sourceBadge}
          user={user}
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        />
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-6">
          <div className="mx-auto w-full max-w-[1480px] px-4 pt-4 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
      <CreditUpgradeModal />
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        projects={projects}
      />
    </div>
  );
}
