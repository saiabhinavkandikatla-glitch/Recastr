import { AppShell } from "@/components/layout/AppShell";
import { SettingsPage } from "@/components/settings/settings-page";
import { getCurrentUser } from "@/lib/current-user";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma/client";
import { projectShellSelect, serializeProjectShell } from "@/lib/projects/serialize";
import type { Project } from "@/lib/types";

export default async function SettingsRoute() {
  const user = await getCurrentUser();
  const projects = await loadProjects(user?.id);

  return (
    <AppShell projects={projects} title="Settings" user={user}>
      <PageHeader title="Settings" backHref="/dashboard" />
      <SettingsPage currentUser={user} />
    </AppShell>
  );
}

async function loadProjects(userId?: string): Promise<Project[]> {

  if (!userId) return env.requireAuth ? [] : [];

  try {
    const projects = await prisma.project.findMany({
      where: { userId },
      select: projectShellSelect,
      orderBy: { createdAt: "desc" },
      take: 8,
    });

    return projects.map(serializeProjectShell);
  } catch {
    return [];
  }
}
