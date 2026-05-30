import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { HookCard } from "@/components/ui/hook-card";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma/client";
import { serializeProject } from "@/lib/projects/serialize";
import type { DbProjectWithContent } from "@/lib/projects/serialize";
import type { Project } from "@/lib/types";

export const runtime = "nodejs";

export default async function HooksPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  const project = await findProject(params.id, user?.id);
  if (!project) notFound();

  return (
    <AppShell projects={[]} title="Viral hooks" sourceBadge={project.title} user={user}>
      <div className="space-y-6">
        <div className="rounded-[28px] border bg-card/80 p-6 shadow-soft">
          <p className="text-sm text-muted-foreground">Viral hook intelligence</p>
          <h1 className="mt-2 text-3xl font-medium tracking-normal">The strongest openings from this source</h1>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(project.hooks ?? []).slice(0, 5).map((hook) => (
            <HookCard key={hook.id} hook={hook} />
          ))}
        </div>
      </div>
    </AppShell>
  );
}

async function findProject(id: string, userId?: string): Promise<Project | null> {
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
