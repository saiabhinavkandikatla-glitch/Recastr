import { getRequestUser } from "@/lib/auth";
import { err, ok } from "@/lib/api-response";
import { apiError } from "@/lib/api/response";
import { prisma } from "@/lib/prisma/client";
import { isPublishingPlatform } from "@/lib/social/types";

export const runtime = "nodejs";

export async function DELETE(
  request: Request,
  { params }: { params: { platform: string } },
) {
  try {
    if (!isPublishingPlatform(params.platform)) {
      return err("Unsupported publishing platform", "unsupported_platform", 400);
    }

    const user = await getRequestUser(request);
    await prisma.socialAccount.deleteMany({
      where: {
        userId: user.id,
        platform: params.platform,
      },
    });
    return ok({ disconnected: true });
  } catch (error) {
    return apiError(error, "social_disconnect_failed", 500);
  }
}
