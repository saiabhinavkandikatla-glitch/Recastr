import { getRequestUser } from "@/lib/auth";
import { scheduleSchema } from "@/lib/ai/schemas";
import { assertEmailConfigured } from "@/lib/email";
import { env } from "@/lib/env";
import { getPlatformCharacterLimit } from "@/lib/platform-limits";
import { prisma } from "@/lib/prisma/client";
import { createStoredScheduledPost, listStoredScheduledPosts } from "@/lib/projects/store";
import { addRecastrJob, jobNames } from "@/lib/queue/client";
import { apiError } from "@/lib/api/response";
import { recordAuditLog } from "@/lib/audit-log";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await getRequestUser(request);
    const localPosts = shouldUseLocalSchedules()
      ? listStoredScheduledPosts().filter((post) => ["PENDING", "SCHEDULED"].includes(post.status))
      : [];
    if (env.demoMode && !env.requireAuth) {
      return Response.json(groupByDate(localPosts));
    }

    const posts = await prisma.scheduledPost.findMany({
      where: { userId: user.id },
      include: { content: true },
      orderBy: { scheduledAt: "asc" },
    });

    return Response.json(
      groupByDate(
        [
          ...posts.map((post) => ({
            id: post.id,
            outputId: post.contentId,
            contentId: post.contentId,
            platform: post.platform,
            publishAt: post.scheduledAt.toISOString(),
            scheduledAt: post.scheduledAt.toISOString(),
            status: post.status.toUpperCase(),
            title: post.content.contentType,
          })),
          ...localPosts,
        ],
      ),
    );
  } catch (error) {
    return apiError(error, "schedule_fetch_failed", 500);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request);
    const payload = scheduleSchema.parse(await request.json());
    const scheduledAt = new Date(payload.scheduledAt ?? payload.publishAt ?? "");
    if (scheduledAt.getTime() <= Date.now()) {
      return Response.json(
        { error: "scheduledAt must be in the future", code: "invalid_schedule_time", status: 400 },
        { status: 400 },
      );
    }

    const contentId = payload.contentId ?? payload.outputId ?? "";
    if (env.demoMode && !env.requireAuth) {
      const post = createStoredScheduledPost({
        contentId,
        platform: payload.platform,
        scheduledAt,
      });
      return Response.json(
        {
          scheduledPostId: post.id,
          publishAt: post.publishAt,
          scheduledAt: post.scheduledAt,
        },
        { status: 201 },
      );
    }
    const content = await prisma.content.findFirst({
      where: {
        id: contentId,
        project: {
          userId: user.id,
        },
      },
      select: { id: true, body: true, platform: true },
    });

    if (!content) {
      return Response.json(
        { error: "Content not found", code: "content_not_found", status: 404 },
        { status: 404 },
      );
    }

    const limit = getPlatformCharacterLimit(content.platform);
    if (content.body.length > limit) {
      return Response.json(
        {
          error: `Content exceeds the ${limit} character limit for ${content.platform}`,
          code: "platform_limit_exceeded",
          status: 422,
        },
        { status: 422 },
      );
    }
    assertEmailConfigured();

    const scheduledPost = await prisma.scheduledPost.upsert({
      where: { contentId },
      update: {
        platform: payload.platform,
        scheduledAt,
        status: "pending",
      },
      create: {
        contentId,
        userId: user.id,
        platform: payload.platform,
        scheduledAt,
        status: "pending",
      },
    });
    const delay = Math.max(0, scheduledAt.getTime() - Date.now());
    await addRecastrJob(
      jobNames.publishPost,
      { scheduledPostId: scheduledPost.id },
      delay,
      { required: true },
    );
    await recordAuditLog({
      userId: user.id,
      action: "content_scheduled",
      entityType: "scheduled_post",
      entityId: scheduledPost.id,
      metadata: { contentId, platform: payload.platform, scheduledAt: scheduledAt.toISOString() },
      request,
    });

    return Response.json(
      {
        scheduledPostId: scheduledPost.id,
        publishAt: scheduledAt.toISOString(),
        scheduledAt: scheduledAt.toISOString(),
      },
      { status: 201 },
    );
  } catch (error) {
    return apiError(error, "schedule_failed", 400);
  }
}

function shouldUseLocalSchedules() {
  return process.env.NODE_ENV !== "production" || env.demoMode;
}

function groupByDate<T extends { publishAt: string }>(posts: T[]) {
  return posts.reduce<Record<string, T[]>>((acc, post) => {
    const date = post.publishAt.slice(0, 10);
    acc[date] = [...(acc[date] ?? []), post];
    return acc;
  }, {});
}
