import Link from "next/link";
import { format } from "date-fns";
import { ArrowRight, FolderOpen, Sparkles, Plus } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
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
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="group relative flex flex-col h-full overflow-hidden rounded-[20px] glass-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-glow"
              >
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-500 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="flex items-start justify-between gap-3 mb-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <Badge variant="muted" className="bg-muted capitalize text-xs">{project.sourceType.toLowerCase()}</Badge>
                </div>

                <h2 className="line-clamp-2 text-xl font-bold font-display group-hover:text-primary transition-colors">{project.title}</h2>
                <p className="mt-2 text-sm font-medium text-muted-foreground flex-1">
                  {project.contents?.length ?? project.outputs.length} generated pieces
                </p>

                <div className="mt-6 flex items-center justify-between border-t border-border/50 pt-4">
                  <span className="text-sm font-medium text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
                    {format(new Date(project.createdAt), "MMM d, yyyy")}
                  </span>
                  <span className="inline-flex items-center text-sm font-semibold text-primary transition-transform group-hover:translate-x-1">
                    Continue <ArrowRight className="ml-1 h-4 w-4" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
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
