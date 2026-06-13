import { AppShell } from "@/components/layout/AppShell";
import { TasksWorkspace } from "@/components/tasks/tasks-workspace";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma/client";
import { listStoredScheduledPosts } from "@/lib/projects/store";
import { projectShellSelect, serializeProjectShell } from "@/lib/projects/serialize";
import type { Platform, PostStatus, Project, ScheduledPost } from "@/lib/types";

export default async function TasksPage() {
  const user = await getCurrentUser();
  const { projects, scheduledPosts } = await loadTasksData(user?.id);

  return (
    <AppShell projects={projects} title="Tasks" user={user}>
      <TasksWorkspace projects={projects} scheduledPosts={scheduledPosts} />
    </AppShell>
  );
}

async function loadTasksData(userId?: string): Promise<{
  projects: Project[];
  scheduledPosts: ScheduledPost[];
}> {

  if (!userId) return { projects: [], scheduledPosts: [] };

  const [projects, scheduledPosts] = await Promise.all([
    prisma.project.findMany({
      where: { userId },
      select: projectShellSelect,
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.scheduledPost.findMany({
      where: { userId },
      include: { content: true },
      orderBy: { scheduledAt: "asc" },
    }),
  ]);

  const localScheduledPosts = process.env.NODE_ENV !== "production" ? listStoredScheduledPosts() : [];

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
