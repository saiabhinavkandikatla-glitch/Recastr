import { z } from "zod";
import { err, ok } from "@/lib/api-response";
import { apiError } from "@/lib/api/response";
import { getRequestUser } from "@/lib/auth";
import { defaultPostingPreference, postingMethodSchema } from "@/lib/posting";
import { isMissingPrismaTable } from "@/lib/prisma/errors";
import { prisma } from "@/lib/prisma/client";

export const runtime = "nodejs";

const preferenceSchema = z.object({
  defaultPostingMethod: postingMethodSchema.optional(),
  postVerificationRequired: z.boolean().optional(),
  timezone: z.string().trim().min(1).max(80).optional(),
});

export async function GET(request: Request) {
  try {
    const user = await getRequestUser(request);

    if (process.env.RECASTR_DEMO_MODE === "true") {
      return ok(defaultPostingPreference);
    }

    const preference = await prisma.userPostingPreference.findUnique({
      where: { userId: user.id },
      select: {
        defaultPostingMethod: true,
        postVerificationRequired: true,
        timezone: true,
      },
    });

    return ok(preference ?? defaultPostingPreference);
  } catch (error) {
    if (isMissingPrismaTable(error)) return ok(defaultPostingPreference);
    return apiError(error, "posting_preferences_fetch_failed", 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getRequestUser(request);
    const payload = preferenceSchema.parse(await request.json());

    if (process.env.RECASTR_DEMO_MODE === "true") {
      return ok({ ...defaultPostingPreference, ...payload });
    }

    const updated = await prisma.userPostingPreference.upsert({
      where: { userId: user.id },
      update: payload,
      create: {
        userId: user.id,
        defaultPostingMethod: payload.defaultPostingMethod ?? defaultPostingPreference.defaultPostingMethod,
        postVerificationRequired: payload.postVerificationRequired ?? defaultPostingPreference.postVerificationRequired,
        timezone: payload.timezone ?? defaultPostingPreference.timezone,
      },
      select: {
        defaultPostingMethod: true,
        postVerificationRequired: true,
        timezone: true,
      },
    });

    return ok(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return err("Invalid posting preferences", "invalid_posting_preferences", 400);
    }
    if (isMissingPrismaTable(error)) {
      return err("Posting settings are not ready yet. Run the Prisma database sync first.", "posting_schema_missing", 503);
    }
    return apiError(error, "posting_preferences_update_failed", 500);
  }
}
