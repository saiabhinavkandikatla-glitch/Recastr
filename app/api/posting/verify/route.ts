import { z } from "zod";
import { err, ok } from "@/lib/api-response";
import { apiError } from "@/lib/api/response";
import { getRequestUser } from "@/lib/auth";
import { isMissingPrismaTable } from "@/lib/prisma/errors";
import { prisma } from "@/lib/prisma/client";

export const runtime = "nodejs";

const verifySchema = z.object({
  scheduledPostId: z.string().trim().min(1),
});

export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request);
    const payload = verifySchema.parse(await request.json());

    const post = await prisma.scheduledPost.findFirst({
      where: {
        id: payload.scheduledPostId,
        userId: user.id,
      },
      select: {
        id: true,
        postingMethod: true,
        status: true,
      },
    });

    if (!post) {
      return err("Scheduled post not found", "scheduled_post_not_found", 404);
    }

    if (post.postingMethod !== "direct_post") {
      return err("Only direct posts require verification", "verification_not_required", 400);
    }

    const updated = await prisma.scheduledPost.update({
      where: { id: post.id },
      data: {
        status: post.status === "pending_verification" ? "scheduled" : post.status,
        verificationRequired: false,
        verifiedAt: new Date(),
        verifiedByUser: true,
      },
      select: {
        id: true,
        status: true,
        verifiedAt: true,
        verifiedByUser: true,
      },
    });

    return ok({
      scheduledPostId: updated.id,
      status: updated.status,
      verifiedAt: updated.verifiedAt?.toISOString() ?? null,
      verifiedByUser: updated.verifiedByUser,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return err("Invalid verification request", "invalid_verification_request", 400);
    }
    if (isMissingPrismaTable(error)) {
      return err("Posting verification is not ready yet. Run the Prisma database sync first.", "posting_schema_missing", 503);
    }
    return apiError(error, "posting_verification_failed", 500);
  }
}
