import { AppShell } from "@/components/layout/AppShell";
import { GeneratorWorkspace } from "@/components/generator/GeneratorWorkspace";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma/client";
import { projectShellSelect, serializeProjectShell } from "@/lib/projects/serialize";
import { listStoredProjects } from "@/lib/projects/store";
import type { Project } from "@/lib/types";

export default async function GeneratePage() {
  const user = await getCurrentUser();
  const projects = await loadRecentProjects(user?.id);

  return (
    <AppShell projects={projects} title="Generator Workspace" sourceBadge="New Content" user={user}>
      <div className="p-6">
        <PageHeader title="Generator Workspace" backHref="/dashboard" />
        <GeneratorWorkspace project={null} initialHistory={projects} />
      </div>
    </AppShell>
  );
}

async function loadRecentProjects(userId?: string): Promise<Project[]> {
  if (!userId) return [];
  const storedProjects = listStoredProjects({ includeFallback: false });

  try {
    const projects = await prisma.project.findMany({
      where: { userId },
      select: projectShellSelect,
      orderBy: { createdAt: "desc" },
      take: 3,
    });
    return mergeProjects(projects.map(serializeProjectShell), storedProjects).slice(0, 3);
  } catch (error) {
    console.error("Failed to load recent projects:", error);
    return storedProjects.slice(0, 3);
  }
}

function mergeProjects(primary: Project[], fallback: Project[]) {
  const seen = new Set<string>();
  return [...primary, ...fallback]
    .filter((project) => {
      if (seen.has(project.id)) return false;
      seen.add(project.id);
      return true;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
