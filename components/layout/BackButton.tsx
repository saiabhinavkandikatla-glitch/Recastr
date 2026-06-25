"use client";

import { useRouter, usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";

/**
 * A universal back-navigation button.
 *
 * Behaviour:
 * - Hidden on top-level pages (e.g. /dashboard) where "back" has no meaning.
 * - Uses `router.back()` so the browser history is respected.
 * - Visible on both mobile and desktop.
 */

const TOP_LEVEL_ROUTES = new Set([
  "/dashboard",
  "/generate",
  "/projects",
  "/schedule",
  "/analytics",
  "/tasks",
  "/assistant",
  "/settings",
  "/onboarding",
]);

export function BackButton() {
  const router = useRouter();
  const pathname = usePathname();

  // Don't show on top-level routes — there's nothing useful to go "back" to
  if (TOP_LEVEL_ROUTES.has(pathname)) return null;

  // Also hide on the root page
  if (pathname === "/") return null;

  return (
    <button
      type="button"
      aria-label="Go back"
      onClick={() => router.back()}
      className="group flex h-8 items-center gap-1.5 rounded-lg border border-transparent px-2.5 text-sm font-medium text-[#8A8A8A] transition-all duration-200 hover:border-[#232323] hover:bg-[#151515] hover:text-white active:scale-[0.97]"
    >
      <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
      <span className="hidden sm:inline">Back</span>
    </button>
  );
}
