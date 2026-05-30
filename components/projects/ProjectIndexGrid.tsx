"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ArrowRight, Sparkles } from "lucide-react";
import { AuthPromptModal } from "@/components/auth/AuthPromptModal";
import { Badge } from "@/components/ui/badge";
import type { Project } from "@/lib/types";

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

  return (
    <>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {projects.map((project) => (
          <button
            key={project.id}
            type="button"
            className="group relative flex h-full flex-col overflow-hidden rounded-[20px] glass-card p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-glow"
            onClick={() => {
              if (demoLocked) {
                setSelectedProjectTitle(project.title);
                setAuthModalOpen(true);
                return;
              }
              router.push(`/projects/${project.id}`);
            }}
          >
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-500 to-cyan-500 opacity-0 transition-opacity group-hover:opacity-100" />

            <div className="mb-5 flex items-start justify-between gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                <Sparkles className="h-5 w-5" />
              </div>
              <Badge variant="muted" className="bg-muted text-xs capitalize">{project.sourceType.toLowerCase()}</Badge>
            </div>

            <h2 className="line-clamp-2 text-xl font-bold font-display transition-colors group-hover:text-primary">{project.title}</h2>
            <p className="mt-2 flex-1 text-sm font-medium text-muted-foreground">
              {project.contents?.length ?? project.outputs.length} generated pieces
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
