import { getRequestUser } from "@/lib/auth";
import { ok } from "@/lib/api-response";
import { apiError } from "@/lib/api/response";
import { prisma } from "@/lib/prisma/client";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await getRequestUser(request);
    if (process.env.RECASTR_DEMO_MODE === "true") return ok([]);

    const accounts = await prisma.socialAccount.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        platform: true,
        handle: true,
        platformId: true,
        expiresAt: true,
        updatedAt: true,
      },
    });

    return ok(
      accounts.map((account) => ({
        ...account,
        expiresAt: account.expiresAt?.toISOString() ?? null,
        updatedAt: account.updatedAt.toISOString(),
      })),
    );
  } catch (error) {
    return apiError(error, "social_accounts_fetch_failed", 500);
  }
}
