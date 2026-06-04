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
    const headerSecret = request.headers.get("x-cron-secret");
    const userAgent = request.headers.get("user-agent")?.toLowerCase() ?? "";
    const hasCronSecret = Boolean(env.CRON_SECRET);
    const isVercelCron = userAgent.includes("vercel-cron");
    const isAuthorizedCron = hasCronSecret && (
      authorization === `Bearer ${env.CRON_SECRET}` ||
      headerSecret === env.CRON_SECRET
    );

    if (!isAuthorizedCron) {
      if (!hasCronSecret && isVercelCron) {
        const result = await processDueScheduledNotifications({ limit: 100 });
        return ok(result);
      }

      const user = await getRequestUser(request).catch(() => null);
      if (!user) {
        const message = hasCronSecret
          ? "Unauthorized cron request"
          : "Set CRON_SECRET in Vercel so scheduled notification cron can run securely";
        return err(message, "unauthorized", 401);
      }
      const result = await processDueScheduledNotifications({ userId: user.id, limit: 25 });
      return ok(result);
    }

    const result = await processDueScheduledNotifications({ limit: 100 });
    return ok(result);
  } catch (error) {
    return apiError(error, "scheduled_notifications_cron_failed", 500);
  }
}
