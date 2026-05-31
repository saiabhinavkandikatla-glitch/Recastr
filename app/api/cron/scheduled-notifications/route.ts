import { err, ok } from "@/lib/api-response";
import { apiError } from "@/lib/api/response";
import { getRequestUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { processDueScheduledNotifications } from "@/lib/scheduled-notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authorization = request.headers.get("authorization");
    if (env.CRON_SECRET && authorization !== `Bearer ${env.CRON_SECRET}`) {
      const user = await getRequestUser(request).catch(() => null);
      if (!user) return err("Unauthorized cron request", "unauthorized", 401);

      const result = await processDueScheduledNotifications({ userId: user.id, limit: 25 });
      return ok(result);
    }

    const result = await processDueScheduledNotifications({ limit: 100 });
    return ok(result);
  } catch (error) {
    return apiError(error, "scheduled_notifications_cron_failed", 500);
  }
}
