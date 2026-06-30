import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { ScheduleCalendar } from "@/components/calendar/ScheduleCalendar";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma/client";
import { listStoredScheduledPosts } from "@/lib/projects/store";
import type { Platform, PostStatus, ScheduledPost } from "@/lib/types";

export const metadata: Metadata = {
  title: "Content Calendar",
  description: "View and manage all your scheduled social media posts on a calendar. Never miss a publishing deadline.",
  openGraph: {
    title: "Content Calendar | Recastr",
    description: "View all your scheduled social posts in one calendar view.",
  },
  twitter: {
    title: "Content Calendar | Recastr",
    description: "View all your scheduled social posts in one calendar view.",
  },
};

export default async function SchedulePage() {
  const user = await getCurrentUser();
  const scheduledPosts = await loadScheduleData(user?.id);

  return (
    <AppShell title="Schedule" user={user}>
      <PageHeader title="Calendar" backHref="/dashboard" />
      <ScheduleCalendar scheduledPosts={scheduledPosts} />
    </AppShell>
  );
}

async function loadScheduleData(userId?: string): Promise<ScheduledPost[]> {

  if (!userId) return [];

  const scheduledPosts = await prisma.scheduledPost.findMany({
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
    });

  const localScheduledPosts = process.env.NODE_ENV !== "production" ? listStoredScheduledPosts() : [];

  return [
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
    ];
}
