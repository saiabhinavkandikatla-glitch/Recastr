import type { Metadata } from "next";
import { Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { TasksWorkspace } from "@/components/tasks/tasks-workspace";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma/client";
import { listStoredScheduledPosts } from "@/lib/projects/store";
import { projectShellSelect, serializeProjectShell } from "@/lib/projects/serialize";
import type { Platform, PostStatus, Project, ScheduledPost } from "@/lib/types";
import { Loader2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Tasks & Reminders",
  description: "Manage your scheduled content reminders, view upcoming posts, and track publishing history across all platforms.",
  openGraph: {
    title: "Tasks & Reminders | Recastr",
    description: "Manage scheduled content reminders and track your publishing history.",
  },
  twitter: {
    title: "Tasks & Reminders | Recastr",
    description: "Manage scheduled content reminders and track your publishing history.",
  },
};

export default async function TasksPage() {
  const user = await getCurrentUser();

  return (
    <AppShell title="Tasks" user={user}>
      <PageHeader title="Tasks" backHref="/dashboard" />
      <Suspense fallback={<TasksSkeleton />}>
        <TasksContent userId={user?.id} />
      </Suspense>
    </AppShell>
  );
}

function TasksSkeleton() {
  return (
    <div className="flex h-[400px] items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--violet)]" />
        <p className="text-sm">Loading tasks...</p>
      </div>
    </div>
  );
}

async function TasksContent({ userId }: { userId?: string }) {
  const { projects, scheduledPosts } = await loadTasksData(userId);
  return <TasksWorkspace projects={projects} scheduledPosts={scheduledPosts} />;
}

async function loadTasksData(userId?: string): Promise<{
  projects: Project[];
  scheduledPosts: ScheduledPost[];
}> {

  if (!userId) return { projects: [], scheduledPosts: [] };
  const localScheduledPosts = shouldUseLocalSchedules() ? listStoredScheduledPosts() : [];

  const [projects, scheduledPosts] = await withTimeout(
    Promise.all([
      prisma.project.findMany({
        where: { userId },
        select: projectShellSelect,
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      prisma.scheduledPost.findMany({
        where: { userId },
        select: {
          id: true,
          contentId: true,
          platform: true,
          postingMethod: true,
          scheduledAt: true,
          status: true,
          timezone: true,
          verificationRequired: true,
          verifiedByUser: true,
          publishedAt: true,
          failReason: true,
          content: { select: { body: true } },
        },
        orderBy: { scheduledAt: "asc" },
      }),
    ]),
    4000,
    [[], []],
  );

  return {
    projects: projects.map(serializeProjectShell),
    scheduledPosts: [
      ...scheduledPosts.map((post) => ({
        id: post.id,
        outputId: post.contentId,
        contentId: post.contentId,
        platform: post.platform as Platform,
        postingMethod: post.postingMethod as "email_reminder" | "direct_post",
        publishAt: post.scheduledAt.toISOString(),
        scheduledAt: post.scheduledAt.toISOString(),
        status: post.status.toUpperCase() as PostStatus,
        title: post.content.body,
        timezone: post.timezone,
        verificationRequired: post.verificationRequired,
        verifiedByUser: post.verifiedByUser,
        publishedAt: post.publishedAt?.toISOString() ?? null,
        failReason: post.failReason,
      })),
      ...localScheduledPosts,
    ],
  };
}

function shouldUseLocalSchedules() {
  return process.env.NODE_ENV !== "production" || process.env.RECASTR_DEMO_MODE === "true";
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T) {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => {
      setTimeout(() => resolve(fallback), timeoutMs);
    }),
  ]);
}
