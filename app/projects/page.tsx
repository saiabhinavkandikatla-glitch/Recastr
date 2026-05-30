import Link from "next/link";
import { FolderOpen, Plus } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ProjectIndexGrid } from "@/components/projects/ProjectIndexGrid";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma/client";
import { serializeProject } from "@/lib/projects/serialize";
import type { Project } from "@/lib/types";

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
              Every source you analyze becomes a project with hooks, generated assets, and export history.
            </p>
          </div>
          <Button asChild className="rounded-full bg-gradient-to-r from-violet-600 to-cyan-500 text-white hover:opacity-90 px-6 shadow-glow shrink-0">
            <Link href="/dashboard">
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Link>
          </Button>
        </div>

        {projects.length ? (
          <ProjectIndexGrid projects={projects} demoLocked={user?.id === "demo-user"} />
        ) : (
          <div className="rounded-[24px] border border-dashed border-white/20 bg-card/30 p-16 text-center glass-panel mt-8">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary shadow-glow mb-6">
              <FolderOpen className="h-10 w-10" />
            </div>
            <h2 className="text-2xl font-bold font-display">No projects yet</h2>
            <p className="mx-auto mt-3 max-w-md text-base leading-relaxed text-muted-foreground">
              Analyze your first source from the dashboard to create a project and start generating content.
            </p>
            <Button asChild size="lg" className="mt-8 rounded-full bg-gradient-to-r from-violet-600 to-cyan-500 text-white hover:opacity-90 px-8 shadow-glow transition-transform hover:scale-105">
              <Link href="/dashboard">
                <Plus className="mr-2 h-5 w-5" />
                Go to dashboard
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
      include: { contents: true, hooks: true },
      orderBy: { createdAt: "desc" },
    });
    return projects.map(serializeProject);
  } catch {
    return [];
  }
}
