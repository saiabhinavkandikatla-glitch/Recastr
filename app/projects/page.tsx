import Link from "next/link";
import { FolderOpen, Plus } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ProjectIndexGrid } from "@/components/projects/ProjectIndexGrid";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma/client";
import { projectShellSelect, serializeProjectShell } from "@/lib/projects/serialize";
import type { DbProjectShell } from "@/lib/projects/serialize";
import type { Platform, Project } from "@/lib/types";

export default async function ProjectsIndexPage() {
  const user = await getCurrentUser();
  const projects = await loadProjects(user?.id);

  return (
    <AppShell projects={projects} title="Projects" user={user}>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-display tracking-tight">Projects</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Every source you analyze becomes a project. Go to the dashboard and paste a URL or text to create a new one.
            </p>
          </div>
          <Button asChild className="rounded-full bg-[var(--violet)] text-white hover:opacity-90 px-6 shrink-0">
            <Link href="/dashboard#source-ingest">
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Link>
          </Button>
        </div>

        {projects.length ? (
          <ProjectIndexGrid projects={projects} demoLocked={user?.id === "demo-user"} />
        ) : (
          <div className="mt-8 rounded-3xl border border-dashed border-[var(--app-line-strong)] bg-[var(--app-surface)] p-16 text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--app-panel)] text-primary">
              <FolderOpen className="h-10 w-10" />
            </div>
            <h2 className="text-2xl font-bold font-display">No projects yet</h2>
            <p className="mx-auto mt-3 max-w-md text-base leading-relaxed text-muted-foreground">
              Analyze your first source from the dashboard to create a project and start generating content.
            </p>
            <Button asChild size="lg" className="mt-8 rounded-full bg-[var(--violet)] px-8 text-white hover:bg-[var(--violet-hover)]">
              <Link href="/dashboard#source-ingest">
                <Plus className="mr-2 h-5 w-5" />
                Start on dashboard
              </Link>
            </Button>
          </div>
        )}
      </div>
    </AppShell>
  );
}

async function loadProjects(userId?: string): Promise<Project[]> {
  if (!userId) return [];

  try {
    const projects = await prisma.project.findMany({
      where: { userId },
      select: {
        ...projectShellSelect,
        contents: {
          select: { id: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 48,
    });
    return projects.map(serializeProjectIndex);
  } catch {
    return [];
  }
}

type ProjectIndexRow = DbProjectShell & {
  contents: Array<{ id: string }>;
};

function serializeProjectIndex(project: ProjectIndexRow): Project {
  const shell = serializeProjectShell(project);
  return {
    ...shell,
    contents: project.contents.map((content, index) => ({
      id: content.id,
      projectId: project.id,
      platform: "TWITTER" as Platform,
      contentType: "Post",
      body: "",
      originalBody: "",
      tone: "casual",
      approved: false,
      order: index,
      scheduledPost: null,
      createdAt: project.createdAt.toISOString(),
    })),
    outputs: [],
  };
}
