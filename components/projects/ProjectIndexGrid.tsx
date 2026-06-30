"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ArrowRight, Sparkles } from "lucide-react";
import { AuthPromptModal } from "@/components/auth/AuthPromptModal";
import { Badge } from "@/components/ui/badge";
import type { Project } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";

export function ProjectIndexGrid({
  projects,
  demoLocked = false,
}: {
  projects: Project[];
  demoLocked?: boolean;
}) {
  const router = useRouter();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [selectedProjectTitle, setSelectedProjectTitle] = useState<string | undefined>();

  const { data: liveProjects = projects } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await fetch("/api/projects");
      return res.json();
    },
    initialData: projects,
  });

  return (
    <>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {liveProjects.map((project) => (
          <button
            key={project.id}
            type="button"
            className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--app-line)] bg-[var(--app-surface)] p-6 text-left transition-all duration-300 hover:scale-[1.01] hover:border-white/30 hover:bg-[#111111]/40 hover:shadow-[0_8px_30px_rgba(255,255,255,0.04)]"
            onClick={() => {
              if (demoLocked) {
                setSelectedProjectTitle(project.title);
                setAuthModalOpen(true);
                return;
              }
              router.push(`/projects/${project.id}`);
            }}
          >
            <div className="mb-5 flex items-start justify-between gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--app-line)] bg-[var(--app-panel)] text-[var(--violet)]">
                <Sparkles className="h-5 w-5" />
              </div>
              <Badge variant="muted" className="border-[var(--app-line)] bg-[var(--app-panel)] text-xs capitalize text-muted-foreground">{((project?.sourceType || '').toLowerCase())}</Badge>
            </div>

            <h2 className="line-clamp-2 text-xl font-bold font-display transition-colors group-hover:text-primary">{project.title}</h2>
            <p className="mt-2 flex-1 text-sm font-medium text-muted-foreground">
              {formatGeneratedCount(project)}
            </p>

            <div className="mt-6 flex items-center justify-between border-t border-border/50 pt-4">
              <span className="rounded-md bg-muted/50 px-2 py-1 text-sm font-medium text-muted-foreground">
                {format(new Date(project.createdAt), "MMM d, yyyy")}
              </span>
              <span className="inline-flex items-center text-sm font-semibold text-primary transition-transform group-hover:translate-x-1">
                Continue <ArrowRight className="ml-1 h-4 w-4" />
              </span>
            </div>
          </button>
        ))}
      </div>

      <AuthPromptModal
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
        projectTitle={selectedProjectTitle}
      />
    </>
  );
}

function formatGeneratedCount(project: Project) {
  const count = project.contents?.length ?? project.outputs.length;
  return count > 0 ? `${count} generated pieces` : "Open content pack";
}
