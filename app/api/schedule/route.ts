import { getRequestUser } from "@/lib/auth";
import { scheduleSchema } from "@/lib/ai/schemas";
import { prisma } from "@/lib/prisma/client";
import { addRecastrJob, jobNames } from "@/lib/queue/client";
import { apiError } from "@/lib/api/response";
import { recordAuditLog } from "@/lib/audit-log";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await getRequestUser(request);
    if (process.env.RECASTR_DEMO_MODE === "true") {
      return Response.json(groupByDate([]));
    }

    const posts = await prisma.scheduledPost.findMany({
      where: { userId: user.id },
      include: { content: true },
      orderBy: { scheduledAt: "asc" },
    });

    return Response.json(
      groupByDate(
        posts.map((post) => ({
          id: post.id,
          outputId: post.contentId,
          contentId: post.contentId,
          platform: post.platform,
          publishAt: post.scheduledAt.toISOString(),
          scheduledAt: post.scheduledAt.toISOString(),
          status: post.status.toUpperCase(),
          title: post.content.contentType,
        })),
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
    if (process.env.RECASTR_DEMO_MODE === "true" || isLocalDemoContent(contentId)) {
      return Response.json(
        {
          scheduledPostId: `scheduled-demo-${Date.now()}`,
          publishAt: scheduledAt.toISOString(),
          scheduledAt: scheduledAt.toISOString(),
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
      select: { id: true },
    });

    if (!content) {
      return Response.json(
        { error: "Content not found", code: "content_not_found", status: 404 },
        { status: 404 },
      );
    }

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
    await addRecastrJob(jobNames.publishPost, { scheduledPostId: scheduledPost.id }, delay);
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

function isLocalDemoContent(contentId: string) {
  return process.env.NODE_ENV !== "production" && contentId.startsWith("demo-");
}

function groupByDate<T extends { publishAt: string }>(posts: T[]) {
  return posts.reduce<Record<string, T[]>>((acc, post) => {
    const date = post.publishAt.slice(0, 10);
    acc[date] = [...(acc[date] ?? []), post];
    return acc;
  }, {});
}
