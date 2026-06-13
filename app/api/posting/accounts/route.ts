import { z } from "zod";
import { err, ok } from "@/lib/api-response";
import { apiError } from "@/lib/api/response";
import { getRequestUser } from "@/lib/auth";
import { encryptPostingSecret } from "@/lib/posting-crypto";
import { POSTING_PLATFORM_LABELS, POSTING_PLATFORMS, postingPlatformSchema } from "@/lib/posting";
import { isMissingPrismaTable } from "@/lib/prisma/errors";
import { prisma } from "@/lib/prisma/client";

export const runtime = "nodejs";

const accountSchema = z.object({
  accessToken: z.string().trim().min(1).max(8000).optional(),
  apiKey: z.string().trim().min(1).max(8000).optional(),
  apiSecret: z.string().trim().min(1).max(8000).optional(),
  expiresAt: z.string().datetime().optional().nullable(),
  handle: z.string().trim().max(80).optional(),
  platform: postingPlatformSchema,
  refreshToken: z.string().trim().min(1).max(8000).optional(),
});

export async function GET(request: Request) {
  try {
    const user = await getRequestUser(request);

    if (process.env.RECASTR_DEMO_MODE === "true") {
      return ok(createEmptyAccountSummaries());
    }

    const accounts = await prisma.userPlatformCredential.findMany({
      where: { userId: user.id },
      select: {
        connectedAt: true,
        expiresAt: true,
        handle: true,
        isActive: true,
        lastError: true,
        lastTestedAt: true,
        platform: true,
      },
      orderBy: { platform: "asc" },
    });

    const byPlatform = new Map(accounts.map((account) => [account.platform, account]));
    return ok(
      POSTING_PLATFORMS.map((platform) => {
        const account = byPlatform.get(platform);
        return {
          connectedAt: account?.connectedAt.toISOString() ?? null,
          expiresAt: account?.expiresAt?.toISOString() ?? null,
          handle: account?.handle ?? null,
          isActive: Boolean(account?.isActive),
          label: POSTING_PLATFORM_LABELS[platform],
          lastError: account?.lastError ?? null,
          lastTestedAt: account?.lastTestedAt?.toISOString() ?? null,
          platform,
        };
      }),
    );
  } catch (error) {
    if (isMissingPrismaTable(error)) return ok(createEmptyAccountSummaries());
    return apiError(error, "posting_accounts_fetch_failed", 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getRequestUser(request);
    const payload = accountSchema.parse(await request.json());
    const accessToken = payload.accessToken ?? payload.apiKey;

    if (!accessToken) {
      return err("Add an access token or API key to connect this platform.", "missing_platform_token", 400);
    }

    if (process.env.RECASTR_DEMO_MODE === "true") {
      return ok({
        connectedAt: new Date().toISOString(),
        expiresAt: payload.expiresAt ?? null,
        handle: payload.handle ?? null,
        isActive: true,
        label: POSTING_PLATFORM_LABELS[payload.platform],
        lastError: null,
        lastTestedAt: null,
        platform: payload.platform,
      });
    }

    const updated = await prisma.userPlatformCredential.upsert({
      where: { userId_platform: { userId: user.id, platform: payload.platform } },
      update: {
        accessToken: encryptPostingSecret(accessToken),
        apiKey: payload.apiKey ? encryptPostingSecret(payload.apiKey) : null,
        apiSecret: payload.apiSecret ? encryptPostingSecret(payload.apiSecret) : null,
        expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : null,
        handle: payload.handle || null,
        isActive: true,
        lastError: null,
        refreshToken: payload.refreshToken ? encryptPostingSecret(payload.refreshToken) : null,
      },
      create: {
        accessToken: encryptPostingSecret(accessToken),
        apiKey: payload.apiKey ? encryptPostingSecret(payload.apiKey) : null,
        apiSecret: payload.apiSecret ? encryptPostingSecret(payload.apiSecret) : null,
        expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : null,
        handle: payload.handle || null,
        platform: payload.platform,
        refreshToken: payload.refreshToken ? encryptPostingSecret(payload.refreshToken) : null,
        userId: user.id,
      },
      select: {
        connectedAt: true,
        expiresAt: true,
        handle: true,
        isActive: true,
        lastError: true,
        lastTestedAt: true,
        platform: true,
      },
    });

    return ok({
      connectedAt: updated.connectedAt.toISOString(),
      expiresAt: updated.expiresAt?.toISOString() ?? null,
      handle: updated.handle,
      isActive: updated.isActive,
      label: POSTING_PLATFORM_LABELS[payload.platform],
      lastError: updated.lastError,
      lastTestedAt: updated.lastTestedAt?.toISOString() ?? null,
      platform: updated.platform,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return err("Invalid platform credentials", "invalid_platform_credentials", 400);
    }
    if (isMissingPrismaTable(error)) {
      return err("Posting accounts are not ready yet. Run the Prisma database sync first.", "posting_schema_missing", 503);
    }
    return apiError(error, "posting_account_update_failed", 500);
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getRequestUser(request);
    const platform = new URL(request.url).searchParams.get("platform") ?? "";
    const parsedPlatform = postingPlatformSchema.parse(platform);

    if (process.env.RECASTR_DEMO_MODE !== "true") {
      await prisma.userPlatformCredential.deleteMany({
        where: { userId: user.id, platform: parsedPlatform },
      });
    }

    return ok({ disconnected: true, platform: parsedPlatform });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return err("Invalid platform", "invalid_platform", 400);
    }
    if (isMissingPrismaTable(error)) {
      return err("Posting accounts are not ready yet. Run the Prisma database sync first.", "posting_schema_missing", 503);
    }
    return apiError(error, "posting_account_disconnect_failed", 500);
  }
}

function createEmptyAccountSummaries() {
  return POSTING_PLATFORMS.map((platform) => ({
    connectedAt: null,
    expiresAt: null,
    handle: null,
    isActive: false,
    label: POSTING_PLATFORM_LABELS[platform],
    lastError: null,
    lastTestedAt: null,
    platform,
  }));
}
