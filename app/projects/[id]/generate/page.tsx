import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { GeneratePanel } from "@/components/projects/generate-panel";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma/client";
import { serializeProject } from "@/lib/projects/serialize";
import type { DbProjectWithContent } from "@/lib/projects/serialize";
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
  if (!userId) return null;

  const timeout = new Promise<DbProjectWithContent | null>((_, reject) =>
    setTimeout(() => reject(new Error("DB Timeout")), 2000),
  );
  try {
    const project = await Promise.race<DbProjectWithContent | null>([
      prisma.project.findFirst({
        where: { id, userId },
        include: { contents: true, hooks: true },
      }),
      timeout
    ]);

    if (project) return serializeProject(project);
    throw new Error("Not found in DB");
  } catch {
    const { getStoredProject } = await import("@/lib/projects/store");
    return getStoredProject(id) || null;
  }
}
