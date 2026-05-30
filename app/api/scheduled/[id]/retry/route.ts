import { err, ok } from "@/lib/api-response";
import { apiError } from "@/lib/api/response";
import { getRequestUser } from "@/lib/auth";
import { assertEmailConfigured } from "@/lib/email";
import { prisma } from "@/lib/prisma/client";
import { retryStoredScheduledPost } from "@/lib/projects/store";
import { addRecastrJob, jobNames } from "@/lib/queue/client";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getRequestUser(request);
    if (isLocalScheduleId(params.id)) {
      const post = retryStoredScheduledPost(params.id);
      if (!post) return err("Scheduled post not found", "scheduled_post_not_found", 404);
      return ok({
        id: params.id,
        status: "PENDING",
      });
    }

    const post = await prisma.scheduledPost.findFirst({
      where: { id: params.id, userId: user.id },
      select: { id: true, scheduledAt: true },
    });

    if (!post) return err("Scheduled post not found", "scheduled_post_not_found", 404);
    assertEmailConfigured();

    await prisma.scheduledPost.update({
      where: { id: params.id },
      data: { status: "pending", failReason: null },
    });
    await addRecastrJob(
      jobNames.publishPost,
      { scheduledPostId: params.id },
      Math.max(0, post.scheduledAt.getTime() - Date.now()),
      { required: true },
    );

    return ok({
      id: params.id,
      status: "PENDING",
    });
  } catch (error) {
    return apiError(error, "scheduled_retry_failed", 500);
  }
}

function isLocalScheduleId(id: string) {
  return process.env.NODE_ENV !== "production" && id.startsWith("scheduled-demo-");
}
