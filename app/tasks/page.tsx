import { AppShell } from "@/components/layout/AppShell";
import { TasksWorkspace } from "@/components/tasks/tasks-workspace";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma/client";
import { serializeProject } from "@/lib/projects/serialize";
import type { Platform, PostStatus, Project, ScheduledPost } from "@/lib/types";

export default async function TasksPage() {
  const user = await getCurrentUser();
  const { projects, scheduledPosts } = await loadTasksData(user?.id);

  return (
    <AppShell projects={projects} title="Tasks & Queue" user={user}>
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
      include: { contents: { include: { scheduledPost: true } }, hooks: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.scheduledPost.findMany({
      where: { userId },
      include: { content: true },
      orderBy: { scheduledAt: "asc" },
    }),
  ]);

  return {
    projects: projects.map(serializeProject),
    scheduledPosts: scheduledPosts.map((post) => ({
      id: post.id,
      outputId: post.contentId,
      contentId: post.contentId,
      platform: post.platform as Platform,
      publishAt: post.scheduledAt.toISOString(),
      scheduledAt: post.scheduledAt.toISOString(),
      status: post.status.toUpperCase() as PostStatus,
      title: post.content.body,
      publishedAt: post.publishedAt?.toISOString() ?? null,
      failReason: post.failReason,
    })),
  };
}
