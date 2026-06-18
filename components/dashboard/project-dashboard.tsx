"use client";

import { useEffect, useState, type ComponentType } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Clock3, FileText, FolderOpen, Sparkles, Timer, Plus } from "lucide-react";
import { AuthPromptModal } from "@/components/auth/AuthPromptModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CurrentUser } from "@/lib/current-user";
import type { Project } from "@/lib/types";

export type DashboardMetrics = {
  projects: number;
  contentCount: number;
  scheduled: number;
};

export function ProjectDashboard({
  initialProjects,
  initialMetrics,
  demoLocked = false,
  user,
}: {
  initialProjects: Project[];
  initialMetrics?: DashboardMetrics;
  demoLocked?: boolean;
  user?: CurrentUser | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [selectedProjectTitle, setSelectedProjectTitle] = useState<string | undefined>();
  const [liveMetrics, setLiveMetrics] = useState<DashboardMetrics>(
    initialMetrics ?? { projects: initialProjects.length, contentCount: 0, scheduled: 0 },
  );
  const isWelcome = searchParams.get("welcome") === "1";
  const firstName = user?.name?.split(" ")[0] ?? user?.email.split("@")[0] ?? "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const fallbackContentCount = initialProjects.reduce(
    (total, project) => total + (project.contents?.length ?? project.outputs.length),
    0,
  );

  const fallbackScheduledCount = initialProjects.reduce((total, project) => {
    if (project.contents?.length) {
      return total + project.contents.filter((content) => Boolean(content.scheduledPost)).length;
    }
    return total;
  }, 0);
  const projectCount = Math.max(liveMetrics.projects, initialProjects.length);
  const contentCount = Math.max(liveMetrics.contentCount, fallbackContentCount);
  const scheduledCount = Math.max(liveMetrics.scheduled, fallbackScheduledCount);
  const projectLabel = `${projectCount} ${projectCount === 1 ? "project" : "projects"}`;

  const timeSavedHours = Math.max(0, (contentCount * 8 + projectCount * 20) / 60);

  const metrics: Array<{
    label: string;
    value: string;
    icon: ComponentType<{ className?: string }>;
    trend: string;
  }> = [
    { label: "Projects created", value: String(projectCount), icon: FileText, trend: "Live count" },
    { label: "Content generated", value: String(contentCount), icon: Sparkles, trend: contentCount > 0 ? "Ready to schedule" : "None yet" },
    { label: "Scheduled posts", value: String(scheduledCount), icon: Clock3, trend: scheduledCount > 0 ? "Email reminders set" : "None scheduled" },
    { label: "Time saved", value: formatHours(timeSavedHours), icon: Timer, trend: "Estimated" },
  ];


  useEffect(() => {
    let ignore = false;

    async function refreshMetrics() {
      try {
        const response = await fetch("/api/usage", { cache: "no-store" });
        const payload = (await response.json()) as {
          data: DashboardMetrics | null;
          error: { message: string; code: string } | null;
        };
        if (!ignore && response.ok && payload.data) {
          setLiveMetrics(payload.data);
        }
      } catch {
        // The server-rendered metrics remain visible if the live refresh fails.
      }
    }

    void refreshMetrics();
    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div className="space-y-10">
      <section>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">{greeting}</p>
        <h1 className="max-w-3xl font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          {contentCount ? (
            <>{firstName}, you have <span className="text-[var(--violet)]">{contentCount} pieces</span> ready.</>
          ) : initialProjects.length ? (
            <>{firstName}, you have <span className="text-[var(--violet)]">{projectLabel}</span> ready.</>
          ) : (
            <>{firstName}, paste a source below to get started.</>
          )}
        </h1>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map(({ icon: Icon, label, trend, value }, index) => (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="group relative overflow-hidden rounded-2xl border border-[var(--app-line)] bg-[var(--app-surface)] p-5"
            initial={{ opacity: 0, y: 20 }}
            key={label}
            transition={{ delay: index * 0.08, duration: 0.4, ease: "easeOut" }}
          >
            <div className="flex items-center justify-between relative z-10">
              <p className="text-sm font-medium text-muted-foreground">{label}</p>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--app-line)] bg-[var(--app-panel)] text-[var(--violet)]">
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-6 flex items-end justify-between relative z-10">
              <p className="font-display text-3xl font-semibold">{value}</p>
              <Badge variant="muted" className="border-[var(--app-line)] bg-[var(--app-panel)] text-xs font-medium text-muted-foreground">{trend}</Badge>
            </div>
          </motion.div>
        ))}
      </div>

      {isWelcome ? (
        <div className="flex items-start gap-3 rounded-2xl border border-[var(--app-line)] bg-[var(--app-surface)] p-4">
          <Sparkles className="h-5 w-5 text-[var(--violet)] mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">Your workspace is ready!</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Your first project is in Recent projects below. Open it to review generated content,
              then use Schedule on any card. You will get an email reminder when it is time to post.
            </p>
          </div>
        </div>
      ) : null}


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
            <Button variant="ghost" asChild className="hidden text-[var(--violet)] hover:bg-[var(--app-panel)] hover:text-[var(--violet)] sm:flex">
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
                  className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--app-line)] bg-[var(--app-surface)] p-5 text-left transition-colors duration-200 hover:border-[var(--app-line-strong)]"
                  onClick={() => {
                    if (demoLocked) {
                      setSelectedProjectTitle(project.title);
                      setAuthModalOpen(true);
                      return;
                    }
                    router.push(`/projects/${project.id}`);
                  }}
                >
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--app-line)] bg-[var(--app-panel)] text-[var(--violet)]">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <Badge variant="muted" className="bg-muted capitalize text-xs">{project.sourceType.toLowerCase()}</Badge>
                  </div>

                  <h3 className="line-clamp-2 text-lg font-bold font-display group-hover:text-primary transition-colors">{project.title}</h3>
                  <p className="mt-2 text-sm font-medium text-muted-foreground flex-1">
                    {formatGeneratedCount(project)}
                  </p>

                  <div className="mt-6 flex items-center justify-between border-t border-border/50 pt-4">
                    <div className="flex -space-x-2">
                      {["twitter", "linkedin", "instagram"].map((platform, i) => (
                        <div
                          key={platform}
                          className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-[var(--app-surface)] text-white"
                          style={{ background: platformColor(platform), zIndex: 3 - i }}
                        >
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
          <div className="rounded-3xl border border-dashed border-[var(--app-line-strong)] bg-[var(--app-surface)] p-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--app-panel)] text-[var(--violet)] mb-6">
              <FolderOpen className="h-8 w-8" />
            </div>
            <h3 className="text-2xl font-bold font-display">No projects yet</h3>
            <p className="mx-auto mt-3 max-w-md text-base leading-relaxed text-muted-foreground">
              Paste a source URL or upload a file above to generate your first content pack.
            </p>
            <div className="mt-8 flex justify-center">
              <Button
                size="lg"
                className="rounded-full bg-[var(--violet)] px-8 text-white hover:bg-[var(--violet-hover)]"
                asChild
              >
                <Link href="/generate">
                  <Plus className="mr-2 h-5 w-5" />
                  Create your first project
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

function platformColor(platform: string) {
  if (platform === "twitter") return "var(--platform-twitter)";
  if (platform === "linkedin") return "var(--platform-linkedin)";
  return "var(--platform-instagram)";
}

function formatGeneratedCount(project: Project) {
  const count = project.contents?.length ?? project.outputs.length;
  return count > 0 ? `Generated ${count} pieces` : "Open content pack";
}

