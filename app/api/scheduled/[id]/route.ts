import { z } from "zod";
import { err, ok } from "@/lib/api-response";
import { apiError } from "@/lib/api/response";
import { getRequestUser } from "@/lib/auth";
import { assertEmailConfigured } from "@/lib/email";
import { prisma } from "@/lib/prisma/client";
import { cancelStoredScheduledPost, updateStoredScheduledPost } from "@/lib/projects/store";
import { addRecastrJob, jobNames } from "@/lib/queue/client";

export const runtime = "nodejs";

const rescheduleSchema = z.object({
  scheduledAt: z.string().datetime(),
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getRequestUser(request);
    const parsed = rescheduleSchema.safeParse(await request.json());
    if (!parsed.success) return err("Invalid schedule time", "validation_error", 400);

    const scheduledAt = new Date(parsed.data.scheduledAt);
    if (scheduledAt.getTime() <= Date.now()) {
      return err("scheduledAt must be in the future", "invalid_schedule_time", 400);
    }

    if (isLocalScheduleId(params.id)) {
      const post = updateStoredScheduledPost(params.id, {
        publishAt: scheduledAt.toISOString(),
        scheduledAt: scheduledAt.toISOString(),
        status: "PENDING",
      });
      if (!post) return err("Scheduled post not found", "scheduled_post_not_found", 404);

      return ok({
        id: params.id,
        scheduledAt: post.scheduledAt,
        publishAt: post.publishAt,
        status: post.status,
      });
    }

    const post = await prisma.scheduledPost.findFirst({
      where: { id: params.id, userId: user.id },
      select: { id: true },
    });

    if (!post) return err("Scheduled post not found", "scheduled_post_not_found", 404);
    assertEmailConfigured();

    await prisma.scheduledPost.update({
      where: { id: params.id },
      data: { scheduledAt, status: "pending" },
    });
    await addRecastrJob(
      jobNames.publishPost,
      { scheduledPostId: params.id },
      Math.max(0, scheduledAt.getTime() - Date.now()),
      { required: true },
    );

    return ok({
      id: params.id,
      scheduledAt: scheduledAt.toISOString(),
      publishAt: scheduledAt.toISOString(),
      status: "PENDING",
    });
  } catch (error) {
    return apiError(error, "scheduled_update_failed", 500);
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getRequestUser(request);
    if (isLocalScheduleId(params.id)) {
      const post = cancelStoredScheduledPost(params.id);
      if (!post) return err("Scheduled post not found", "scheduled_post_not_found", 404);
      return ok({
        id: params.id,
        status: "CANCELLED",
      });
    }

    const post = await prisma.scheduledPost.findFirst({
      where: { id: params.id, userId: user.id },
      select: { id: true },
    });

    if (!post) return err("Scheduled post not found", "scheduled_post_not_found", 404);

    await prisma.scheduledPost.update({
      where: { id: params.id },
      data: { status: "cancelled" },
    });

    return ok({
      id: params.id,
      status: "CANCELLED",
    });
  } catch (error) {
    return apiError(error, "scheduled_cancel_failed", 500);
  }
}

function isLocalScheduleId(id: string) {
  return process.env.NODE_ENV !== "production" && id.startsWith("scheduled-demo-");
}
