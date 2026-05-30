import { ok } from "@/lib/api-response";
import { apiError } from "@/lib/api/response";
import { getRequestUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma/client";
import type { Platform, PostStatus } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await getRequestUser(request);
    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
    const platform = url.searchParams.get("platform");
    const status = url.searchParams.get("status");
    const pageSize = 20;
    const where = {
      userId: user.id,
      status: {
        in: ["published", "failed", "cancelled"],
      },
      ...(platform ? { platform: platform.toUpperCase() } : {}),
      ...(status ? { status: status.toLowerCase() } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.scheduledPost.findMany({
        where,
        include: { content: true },
        orderBy: { scheduledAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.scheduledPost.count({ where }),
    ]);

    return ok({
      items: items.map((post) => ({
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
      page,
      pageSize,
      total,
    });
  } catch (error) {
    return apiError(error, "history_fetch_failed", 500);
  }
}
