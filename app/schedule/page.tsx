import { AppShell } from "@/components/layout/AppShell";
import { ScheduleCalendar } from "@/components/calendar/ScheduleCalendar";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma/client";
import { serializeProject } from "@/lib/projects/serialize";
import type { Platform, PostStatus, Project, ScheduledPost } from "@/lib/types";

export default async function SchedulePage() {
  const user = await getCurrentUser();
  const { projects, scheduledPosts } = await loadScheduleData(user?.id);

  return (
    <AppShell projects={projects} title="Schedule" user={user}>
      <ScheduleCalendar scheduledPosts={scheduledPosts} />
    </AppShell>
  );
}

async function loadScheduleData(userId?: string): Promise<{
  projects: Project[];
  scheduledPosts: ScheduledPost[];
}> {

  if (!userId) return { projects: [], scheduledPosts: [] };

  const [projects, scheduledPosts] = await Promise.all([
    prisma.project.findMany({
      where: { userId },
      include: { contents: true, hooks: true },
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
