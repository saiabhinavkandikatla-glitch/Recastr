import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { ProjectWorkspace } from "@/components/projects/project-workspace";
import { getCurrentUser } from "@/lib/current-user";
import { isDemoMode } from "@/lib/env";
import { prisma } from "@/lib/prisma/client";
import {
  projectShellSelect,
  projectWorkspaceSelect,
  serializeProject,
  serializeProjectShell,
} from "@/lib/projects/serialize";
import type { DbProjectShell } from "@/lib/projects/serialize";
import { getCachedProject, getStoredProject, listStoredProjects } from "@/lib/projects/store";
import type { Project } from "@/lib/types";

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const project = await findProjectMetadata(params.id);

  return {
    title: project ? `${project.title} - Recastr` : "Project - Recastr",
    openGraph: {
      title: project?.title ?? "Recastr project",
      description: "Generated social content pack from Recastr.",
      images: [project?.thumbnailUrl ?? "/og-image.png"],
    },
  };
}

export default async function ProjectPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  const [project, shellProjects] = await Promise.all([
    findProject(params.id, user?.id),
    loadShellProjects(user?.id),
  ]);
  if (!project) notFound();
  const projectsForShell = mergeProjects(shellProjects, [project]);

  return (
    <AppShell projects={projectsForShell} title="Projects" sourceBadge={project.title} user={user}>
      <ProjectWorkspace project={project} readOnly={user?.id === "demo-user"} />
    </AppShell>
  );
}

async function findProjectMetadata(id: string): Promise<Pick<Project, "title" | "thumbnailUrl"> | null> {
  const cachedProject = getCachedProject(id);
  if (cachedProject) return { title: cachedProject.title, thumbnailUrl: cachedProject.thumbnailUrl };
  if (isDemoMode()) {
    const localProject = getStoredProject(id);
    return localProject ? { title: localProject.title, thumbnailUrl: localProject.thumbnailUrl } : null;
  }

  try {
    const project = await prisma.project.findUnique({
      where: { id },
      select: { title: true, thumbnailUrl: true },
    });

    return project ? { title: project.title, thumbnailUrl: project.thumbnailUrl ?? undefined } : null;
  } catch {
    const fallback = getCachedProject(id);
    return fallback ? { title: fallback.title, thumbnailUrl: fallback.thumbnailUrl } : null;
  }
}

async function findProject(id: string, userId?: string): Promise<Project | null> {
  const cachedProject = getCachedProject(id);
  if (cachedProject) return cachedProject;
  if (isDemoMode()) return getStoredProject(id) ?? null;
  if (!userId) return null;

  try {
    const project = await prisma.project.findFirst({
      where: { id, userId },
      select: projectWorkspaceSelect,
    });

    return project ? serializeProject(project) : null;
  } catch {
    return getCachedProject(id) ?? null;
  }
}

async function loadShellProjects(userId?: string): Promise<Project[]> {
  const storedProjects = listStoredProjects({ includeFallback: false });
  if (!userId || isDemoMode()) return storedProjects;

  try {
    const projects = await prisma.project.findMany({
      where: { userId },
      select: projectShellSelect,
      orderBy: { createdAt: "desc" },
      take: 12,
    });

    return mergeProjects(projects.map((project: DbProjectShell) => serializeProjectShell(project)), storedProjects);
  } catch (error) {
    console.error("Failed to load project shell list:", error);
    return storedProjects;
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
