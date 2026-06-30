import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { ProjectDashboard, type DashboardMetrics } from "@/components/dashboard/project-dashboard";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma/client";
import { projectShellSelect, serializeProjectShell } from "@/lib/projects/serialize";
import type { DbProjectShell } from "@/lib/projects/serialize";
import type { Project } from "@/lib/types";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "View your recent projects, content metrics, and scheduled reminders in your Recastr dashboard.",
  openGraph: {
    title: "Dashboard | Recastr",
    description: "View your recent projects, content metrics, and scheduled reminders.",
  },
  twitter: {
    title: "Dashboard | Recastr",
    description: "View your recent projects, content metrics, and scheduled reminders.",
  },
};

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const [projects, metrics] = await Promise.all([
    loadProjects(user?.id),
    loadDashboardMetrics(user?.id),
  ]);

  return (
    <AppShell projects={projects} title="Dashboard" user={user}>
      <ProjectDashboard
        initialProjects={projects}
        initialMetrics={metrics}
        demoLocked={user?.id === "demo-user"}
        user={user}
      />
    </AppShell>
  );
}

async function loadProjects(userId?: string): Promise<Project[]> {
  if (!userId) return [];

  const timeout = new Promise<DbProjectShell[]>((_, reject) =>
    setTimeout(() => reject(new Error("DB Timeout")), 8000),
  );
  try {
    const projects = await Promise.race<DbProjectShell[]>([
      prisma.project.findMany({
        where: { userId },
        select: projectShellSelect,
        orderBy: { createdAt: "desc" },
        take: 12,
      }),
      timeout,
    ]);

    return projects.map(serializeProjectShell);
  } catch (error) {
    console.error("Failed to load projects:", error);
    return [];
  }
}

async function loadDashboardMetrics(userId?: string): Promise<DashboardMetrics> {
  if (!userId) {
    return { projects: 0, contentCount: 0, scheduled: 0 };
  }

  if (process.env.RECASTR_DEMO_MODE === "true") {
    return { projects: 3, contentCount: 42, scheduled: 6 };
  }

  try {
    const [projects, contentCount, scheduled] = await Promise.all([
      prisma.project.count({ where: { userId } }),
      prisma.content.count({ where: { project: { userId } } }),
      prisma.scheduledPost.count({
        where: {
          userId,
          status: { in: ["pending", "scheduled", "PENDING", "SCHEDULED"] },
        },
      }),
    ]);

    return { projects, contentCount, scheduled };
  } catch (error) {
    console.error("Failed to load dashboard metrics:", error);
    return { projects: 0, contentCount: 0, scheduled: 0 };
  }
}
