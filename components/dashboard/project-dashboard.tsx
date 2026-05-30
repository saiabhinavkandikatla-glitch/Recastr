"use client";

import { useState, type ComponentType, type SVGProps } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Clock3, FileText, FolderOpen, Sparkles, Timer, Plus } from "lucide-react";
import { AuthPromptModal } from "@/components/auth/AuthPromptModal";
import { IngestFlow } from "@/components/ingest/IngestFlow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Project } from "@/lib/types";

export function ProjectDashboard({
  initialProjects,
  demoLocked = false,
}: {
  initialProjects: Project[];
  demoLocked?: boolean;
}) {
  const router = useRouter();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [selectedProjectTitle, setSelectedProjectTitle] = useState<string | undefined>();
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const projectsThisMonth = initialProjects.filter((project) => {
    const createdAt = new Date(project.createdAt);
    return createdAt.getMonth() === currentMonth && createdAt.getFullYear() === currentYear;
  }).length;

  const contentCount = initialProjects.reduce(
    (total, project) => total + (project.contents?.length ?? project.outputs.length),
    0,
  );

  const scheduledCount = initialProjects.reduce((total, project) => {
    if (project.contents?.length) {
      return total + project.contents.filter((content) => Boolean(content.scheduledPost)).length;
    }
    return total + project.outputs.filter((output) => output.approved && project.status === "SCHEDULED").length;
  }, 0);

  const timeSavedHours = Math.max(0, (contentCount * 8 + initialProjects.length * 20) / 60);

  const metrics: Array<{
    label: string;
    value: string;
    icon: ComponentType<{ className?: string }>;
    trend: string;
    color: string;
  }> = [
    { label: "Projects this month", value: String(projectsThisMonth), icon: FileText, trend: "Current", color: "from-blue-500 to-cyan-500" },
    { label: "Content generated", value: String(contentCount), icon: Sparkles, trend: "Ready to schedule", color: "from-violet-500 to-purple-500" },
    { label: "Scheduled posts", value: String(scheduledCount), icon: Clock3, trend: "Live", color: "from-amber-500 to-orange-500" },
    { label: "Time saved", value: formatHours(timeSavedHours), icon: Timer, trend: "Estimated", color: "from-emerald-500 to-teal-500" },
  ];

  return (
    <div className="space-y-10">
      <section>
        <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">Welcome back</p>
        <h1 className="text-3xl font-bold font-display tracking-tight sm:text-4xl">
          {contentCount ? (
            <>You have <span className="text-gradient">{contentCount} pieces</span> ready to refine.</>
          ) : (
            "Create your first content pack."
          )}
        </h1>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map(({ icon: Icon, label, trend, value, color }, index) => (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="group relative overflow-hidden rounded-[20px] glass-card p-5"
            initial={{ opacity: 0, y: 20 }}
            key={label}
            transition={{ delay: index * 0.08, duration: 0.4, ease: "easeOut" }}
          >
            <div className={`absolute right-0 top-0 h-24 w-24 -translate-y-8 translate-x-8 rounded-full bg-gradient-to-br ${color} opacity-10 blur-2xl transition-opacity group-hover:opacity-20`} />

            <div className="flex items-center justify-between relative z-10">
              <p className="text-sm font-medium text-muted-foreground">{label}</p>
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${color} text-white shadow-sm`}>
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-6 flex items-end justify-between relative z-10">
              <p className="text-3xl font-bold font-display">{value}</p>
              <Badge variant="muted" className="bg-muted text-xs font-medium border-0">{trend}</Badge>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="relative rounded-[24px] border border-white/5 bg-card/40 backdrop-blur-md p-1 shadow-lg">
        <div className="absolute inset-0 rounded-[24px] bg-gradient-to-br from-primary/5 via-transparent to-cyan-500/5 pointer-events-none" />
        <div className="relative z-10 bg-card rounded-[20px] p-6 sm:p-8">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Zap className="h-3 w-3" />
                </div>
                <h2 className="text-xl font-bold font-display">Quick Ingest</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Analyze a source, select hooks, then stream generated content without leaving the page.
              </p>
            </div>
          </div>
          {/* Note: passing empty array instead of initialProjects to remove demo links inside IngestFlow */}
          <IngestFlow />
        </div>
      </div>

      <section>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold font-display flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-muted-foreground" />
              Recent projects
            </h2>
            <p className="text-sm text-muted-foreground mt-1">Continue editing, exporting, or scheduling generated assets.</p>
          </div>
          {initialProjects.length > 0 && (
            <Button variant="ghost" asChild className="hidden sm:flex text-primary hover:text-primary hover:bg-primary/10">
              <Link href="/projects">View all <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          )}
        </div>

        {initialProjects.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {initialProjects.slice(0, 6).map((project, index) => (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
                key={project.id}
              >
                <button
                  type="button"
                  className="group relative flex h-full flex-col overflow-hidden rounded-[20px] glass-card p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-glow"
                  onClick={() => {
                    if (demoLocked) {
                      setSelectedProjectTitle(project.title);
                      setAuthModalOpen(true);
                      return;
                    }
                    router.push(`/projects/${project.id}`);
                  }}
                >
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-500 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <Badge variant="muted" className="bg-muted capitalize text-xs">{project.sourceType.toLowerCase()}</Badge>
                  </div>

                  <h3 className="line-clamp-2 text-lg font-bold font-display group-hover:text-primary transition-colors">{project.title}</h3>
                  <p className="mt-2 text-sm font-medium text-muted-foreground flex-1">
                    Generated {project.contents?.length ?? project.outputs.length} pieces
                  </p>

                  <div className="mt-6 flex items-center justify-between border-t border-border/50 pt-4">
                    <div className="flex -space-x-2">
                      {["twitter", "linkedin", "instagram"].map((platform, i) => (
                        <div key={platform} className={`h-6 w-6 rounded-full border-2 border-card bg-[var(--platform-${platform})] flex items-center justify-center text-white z-[${3-i}]`}>
                          <span className="text-[8px] font-bold">{platform.charAt(0).toUpperCase()}</span>
                        </div>
                      ))}
                    </div>
                    <span className="inline-flex items-center text-sm font-semibold text-primary transition-transform group-hover:translate-x-1">
                      Open <ArrowRight className="ml-1 h-4 w-4" />
                    </span>
                  </div>
                </button>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="rounded-[24px] border border-dashed border-white/20 bg-card/30 p-12 text-center glass-panel">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary shadow-glow mb-6">
              <FolderOpen className="h-8 w-8" />
            </div>
            <h3 className="text-2xl font-bold font-display">No projects yet</h3>
            <p className="mx-auto mt-3 max-w-md text-base leading-relaxed text-muted-foreground">
              Paste a source URL or upload a file above to generate your first content pack.
            </p>
            <div className="mt-8 flex justify-center">
              <Button asChild size="lg" className="rounded-full bg-gradient-to-r from-violet-600 to-cyan-500 text-white hover:opacity-90 px-8 shadow-glow">
                <Link href="/onboarding">
                  <Plus className="mr-2 h-5 w-5" />
                  Create a project
                </Link>
              </Button>
            </div>
          </div>
        )}
      </section>
      <AuthPromptModal
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
        projectTitle={selectedProjectTitle}
      />
    </div>
  );
}

function formatHours(hours: number) {
  if (hours <= 0) return "0 hrs";
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} hrs`;
}

// Icon definition for Zap missing from Lucide imports
function Zap(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}
