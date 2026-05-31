import { AppShell } from "@/components/layout/AppShell";
import { ProjectDashboard } from "@/components/dashboard/project-dashboard";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma/client";
import { serializeProject } from "@/lib/projects/serialize";
import type { DbProjectWithContent } from "@/lib/projects/serialize";
import type { Project } from "@/lib/types";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const projects = await loadProjects(user?.id);

  return (
    <AppShell projects={projects} title="Dashboard" user={user}>
      <ProjectDashboard
        initialProjects={projects}
        demoLocked={user?.id === "demo-user"}
        user={user}
      />
    </AppShell>
  );
}

async function loadProjects(userId?: string): Promise<Project[]> {
  if (!userId) return [];

  const timeout = new Promise<DbProjectWithContent[]>((_, reject) =>
    setTimeout(() => reject(new Error("DB Timeout")), 8000),
  );
  try {
    const projects = await Promise.race<DbProjectWithContent[]>([
      prisma.project.findMany({
        where: { userId },
        include: { contents: { include: { scheduledPost: true } }, hooks: true },
        orderBy: { createdAt: "desc" },
      }),
      timeout
    ]);

    return projects.map(serializeProject);
  } catch (error) {
    console.error("Failed to load projects:", error);
    return [];
  }
}
