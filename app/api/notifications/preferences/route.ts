import { z } from "zod";
import { getRequestUser } from "@/lib/auth";
import { err, ok } from "@/lib/api-response";
import { apiError } from "@/lib/api/response";
import { prisma } from "@/lib/prisma/client";

export const runtime = "nodejs";

const notificationPreferencesSchema = z
  .object({
    notifyContentReady: z.boolean().optional(),
    notifyWeeklyDigest: z.boolean().optional(),
    notifyScheduleReminder: z.boolean().optional(),
    notifyMarketing: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one notification preference is required",
  });

export async function GET(request: Request) {
  try {
    const user = await getRequestUser(request);
    if (process.env.RECASTR_DEMO_MODE === "true") {
      return ok({
        notifyContentReady: true,
        notifyWeeklyDigest: true,
        notifyScheduleReminder: false,
        notifyMarketing: false,
      });
    }

    const profile = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        notifyContentReady: true,
        notifyWeeklyDigest: true,
        notifyScheduleReminder: true,
        notifyMarketing: true,
      },
    });

    return ok(
      profile ?? {
        notifyContentReady: true,
        notifyWeeklyDigest: true,
        notifyScheduleReminder: false,
        notifyMarketing: false,
      },
    );
  } catch (error) {
    return apiError(error, "notification_preferences_fetch_failed", 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getRequestUser(request);
    const prefs = notificationPreferencesSchema.parse(await request.json());
    if (process.env.RECASTR_DEMO_MODE === "true") return ok({ updated: true, demo: true });

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: prefs,
      select: {
        notifyContentReady: true,
        notifyWeeklyDigest: true,
        notifyScheduleReminder: true,
        notifyMarketing: true,
      },
    });

    return ok(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return err(error.issues[0]?.message ?? "Invalid preferences", "invalid_preferences", 400);
    }
    return apiError(error, "notification_preferences_update_failed", 500);
  }
}
