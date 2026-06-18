import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { GeneratePanel } from "@/components/projects/generate-panel";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma/client";
import { projectWorkspaceSelect, serializeProject } from "@/lib/projects/serialize";
import type { DbProjectWorkspace } from "@/lib/projects/serialize";
import { getCachedProject } from "@/lib/projects/store";
import type { Project } from "@/lib/types";

export const runtime = "nodejs";

export default async function GeneratePage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  const project = await findProject(params.id, user?.id);
  if (!project) notFound();

  return (
    <AppShell projects={[]} title="Generate" sourceBadge={project.title} user={user}>
      <GeneratePanel project={project} />
    </AppShell>
  );
}

async function findProject(id: string, userId?: string): Promise<Project | null> {
  if (!userId) return null;
  const cachedProject = getCachedProject(id);
  if (cachedProject) return cachedProject;

  const timeout = new Promise<DbProjectWorkspace | null>((_, reject) =>
    setTimeout(() => reject(new Error("DB Timeout")), 8000),
  );
  try {
    const project = await Promise.race<DbProjectWorkspace | null>([
      prisma.project.findFirst({
        where: { id, userId },
        select: projectWorkspaceSelect,
      }),
      timeout,
    ]);

    if (project) return serializeProject(project);
    return null;
  } catch {
    return getCachedProject(id) || null;
  }
}
