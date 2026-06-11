import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ProjectAuthGate } from "@/components/auth/ProjectAuthGate";
import { AppShell } from "@/components/layout/AppShell";
import { ProjectWorkspace } from "@/components/projects/project-workspace";
import { getCurrentUser } from "@/lib/current-user";
import { isDemoMode } from "@/lib/env";
import { prisma } from "@/lib/prisma/client";
import { projectWorkspaceSelect, serializeProject } from "@/lib/projects/serialize";
import { getStoredProject, listStoredProjects } from "@/lib/projects/store";
import type { Project } from "@/lib/types";

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const project = await findProjectMetadata(params.id);

  return {
    title: project ? `${project.title} - Recastr` : "Project - Recastr",
    openGraph: {
      title: project?.title ?? "Recastr project",
      description: "Generated social content pack from Recastr.",
      images: [project?.thumbnailUrl ?? "/og-image.svg"],
    },
  };
}

export default async function ProjectPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  const project = await findProject(params.id, user?.id);
  if (!project) notFound();
  const shellProjects = listStoredProjects({ includeFallback: false });

  return (
    <AppShell projects={shellProjects.length ? shellProjects : [project]} title="Projects" sourceBadge={project.title} user={user}>
      {user?.id === "demo-user" ? <ProjectAuthGate project={project} /> : <ProjectWorkspace project={project} />}
    </AppShell>
  );
}

async function findProjectMetadata(id: string): Promise<Pick<Project, "title" | "thumbnailUrl"> | null> {
  const localProject = getStoredProject(id);
  if (localProject) return { title: localProject.title, thumbnailUrl: localProject.thumbnailUrl };
  if (isDemoMode()) return null;

  try {
    const project = await prisma.project.findUnique({
      where: { id },
      select: { title: true, thumbnailUrl: true },
    });

    return project ? { title: project.title, thumbnailUrl: project.thumbnailUrl ?? undefined } : null;
  } catch {
    const fallback = getStoredProject(id);
    return fallback ? { title: fallback.title, thumbnailUrl: fallback.thumbnailUrl } : null;
  }
}

async function findProject(id: string, userId?: string): Promise<Project | null> {
  const localProject = getStoredProject(id);
  if (localProject) return localProject;
  if (!userId || isDemoMode()) return null;

  try {
    const project = await prisma.project.findFirst({
      where: { id, userId },
      select: projectWorkspaceSelect,
    });

    return project ? serializeProject(project) : getStoredProject(id) ?? null;
  } catch {
    return getStoredProject(id) ?? null;
  }
}
