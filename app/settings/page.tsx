import { AppShell } from "@/components/layout/AppShell";
import { SettingsPage } from "@/components/settings/settings-page";
import { getCurrentUser } from "@/lib/current-user";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma/client";
import { serializeProject } from "@/lib/projects/serialize";
import type { Project } from "@/lib/types";

export default async function SettingsRoute() {
  const user = await getCurrentUser();
  const projects = await loadProjects(user?.id);

  return (
    <AppShell projects={projects} title="Settings" user={user}>
      <SettingsPage currentUser={user} />
    </AppShell>
  );
}

async function loadProjects(userId?: string): Promise<Project[]> {

  if (!userId) return env.requireAuth ? [] : [];

  try {
    const projects = await prisma.project.findMany({
      where: { userId },
      include: { contents: { include: { scheduledPost: true } }, hooks: true },
      orderBy: { createdAt: "desc" },
    });

    return projects.map(serializeProject);
  } catch {
    return [];
  }
}
