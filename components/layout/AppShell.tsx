"use client";

import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { TopNavbar } from "./TopNavbar";
import { EmailVerifiedSuccess } from "@/components/auth/EmailVerifiedSuccess";
import { CreditUpgradeModal } from "@/components/billing/CreditUpgradeModal";
import { ScheduledNotificationHeartbeat } from "@/components/layout/ScheduledNotificationHeartbeat";
import type { CurrentUser } from "@/lib/current-user";
import type { Project } from "@/lib/types";

export function AppShell({
  children,
  projects,
  title = "Workspace",
  sourceBadge,
  user,
}: {
  children: ReactNode;
  projects?: Project[];
  title?: string;
  sourceBadge?: string;
  user?: CurrentUser | null;
}) {
  return (
    <div className="flex min-h-screen bg-[#090909] text-white selection:bg-white selection:text-black">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopNavbar />
        <main className="flex-1 overflow-y-auto px-4 md:px-6 lg:px-8 py-6 relative">
          <div className="mx-auto max-w-[1440px] w-full animate-in fade-in duration-500">
            {children}
          </div>
        </main>
      </div>
      <CreditUpgradeModal />
      <EmailVerifiedSuccess />
      <ScheduledNotificationHeartbeat enabled={Boolean(user)} />
    </div>
  );
}
