"use client";

import { useEffect } from "react";

export function ScheduledNotificationHeartbeat({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    async function processDueNotifications() {
      if (cancelled || document.visibilityState === "hidden") return;

      await fetch("/api/cron/scheduled-notifications", {
        cache: "no-store",
      }).catch(() => undefined);
    }

    void processDueNotifications();
    const interval = window.setInterval(() => {
      void processDueNotifications();
    }, 60_000);

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void processDueNotifications();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [enabled]);

  return null;
}
