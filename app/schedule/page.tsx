import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { ScheduleCalendar } from "@/components/calendar/ScheduleCalendar";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma/client";
import { listStoredScheduledPosts } from "@/lib/projects/store";
import { projectShellSelect, serializeProjectShell } from "@/lib/projects/serialize";
import type { Platform, PostStatus, Project, ScheduledPost } from "@/lib/types";

export default async function SchedulePage() {
  const user = await getCurrentUser();
  const { projects, scheduledPosts } = await loadScheduleData(user?.id);

  return (
    <AppShell projects={projects} title="Schedule" user={user}>
      <PageHeader title="Calendar" backHref="/dashboard" />
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
