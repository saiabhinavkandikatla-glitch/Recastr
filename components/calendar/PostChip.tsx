"use client";

import { cn, formatPlatform } from "@/lib/utils";
import type { Platform } from "@/lib/types";

const platformColor: Record<Platform, string> = {
  TWITTER: "border-sky-500 bg-sky-50 text-sky-700",
  LINKEDIN: "border-blue-700 bg-blue-50 text-blue-700",
  INSTAGRAM: "border-pink-500 bg-pink-50 text-pink-700",
  FACEBOOK: "border-blue-600 bg-blue-50 text-blue-700",
  THREADS: "border-zinc-900 bg-zinc-100 text-zinc-900",
  YOUTUBE: "border-red-600 bg-red-50 text-red-700",
  CAROUSEL: "border-amber-500 bg-amber-50 text-amber-700",
  COMMUNITY: "border-emerald-500 bg-emerald-50 text-emerald-700",
  STORY: "border-violet-500 bg-violet-50 text-violet-700",
};

export function PostChip({
  platform,
  title,
  className,
}: {
  platform: Platform;
  title: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-[8px] border px-3 py-2 text-xs", platformColor[platform], className)}>
      <p className="font-medium">{title}</p>
      <p className="mt-1 opacity-75">{formatPlatform(platform)}</p>
    </div>
  );
}
