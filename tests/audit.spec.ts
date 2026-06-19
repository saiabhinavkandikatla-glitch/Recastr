import { test, expect } from "@playwright/test";

const routes = [
  "/",
  "/login",
  "/signup",
  "/dashboard",
  "/generate",
  "/projects",
  "/schedule",
  "/settings",
  "/tasks",
  "/media",
  "/analytics",
  "/assistant",
  "/billing",
  "/onboarding",
  "/blog",
  "/docs",
  "/terms",
  "/privacy",
  "/contact"
];

for (const route of routes) {
  test(`Audit route on Desktop: ${route}`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    const consoleErrors: string[] = [];
    page.on("pageerror", (err) => {
      consoleErrors.push(err.message);
    });
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    const failedRequests: string[] = [];
    page.on("requestfailed", (req) => {
      const url = req.url();
      const errText = req.failure()?.errorText || "";
      if (
        !url.includes("vercel-scripts.com") &&
        !url.includes("vercel-analytics.com") &&
        !url.includes("posthog.com") &&
        errText !== "net::ERR_ABORTED"
      ) {
        failedRequests.push(`${req.method()} ${url}: ${errText}`);
      }
    });
    page.on("response", (res) => {
      const url = res.url();
      if (
        res.status() >= 400 &&
        !url.includes("/api/auth/") &&
        !url.includes("/_next/") &&
        !url.includes("supabase") &&
        !url.includes("vercel-scripts.com") &&
        !url.includes("vercel-analytics.com") &&
        !url.includes("posthog.com")
      ) {
        failedRequests.push(`${res.request().method()} ${url}: ${res.status()} ${res.statusText()}`);
      }
    });

    try {
      await page.goto(route, { waitUntil: "domcontentloaded", timeout: 10000 });
      await page.waitForTimeout(1500);
    } catch (err: any) {
      failedRequests.push(`Navigation failed: ${err.message}`);
    }

    expect(consoleErrors).toEqual([]);
    expect(failedRequests).toEqual([]);

    const hasScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasScroll).toBe(false);

    await page.screenshot({ path: `artifacts/screenshots/desktop_${route.replace(/\//g, "_") || "homepage"}.png` });
  });

  test(`Audit route on Mobile: ${route}`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    const consoleErrors: string[] = [];
    page.on("pageerror", (err) => {
      consoleErrors.push(err.message);
    });

    try {
      await page.goto(route, { waitUntil: "domcontentloaded", timeout: 10000 });
      await page.waitForTimeout(1500);
    } catch (err: any) {
      consoleErrors.push(`Navigation failed: ${err.message}`);
    }

    expect(consoleErrors).toEqual([]);

    const hasScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasScroll).toBe(false);

    await page.screenshot({ path: `artifacts/screenshots/mobile_${route.replace(/\//g, "_") || "homepage"}.png` });
  });
}
