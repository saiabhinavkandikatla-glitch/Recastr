"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { postHogClientConfig } from "@/lib/analytics-client";

export function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const key = postHogClientConfig.key;
    if (!key || typeof navigator === "undefined") return;
    const payload = JSON.stringify({
      api_key: key,
      event: "$pageview",
      properties: {
        $current_url: `${window.location.origin}${pathname}${searchParams.toString() ? `?${searchParams}` : ""}`,
      },
    });
    navigator.sendBeacon(`${postHogClientConfig.host}/capture/`, payload);
  }, [pathname, searchParams]);

  return null;
}
