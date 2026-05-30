import { Badge } from "@/components/ui/badge";
import { cn, formatPlatform } from "@/lib/utils";
import type { Platform } from "@/lib/types";

const platformClass: Record<Platform, string> = {
  TWITTER: "bg-sky-500/10 text-sky-600 ring-sky-500/20 dark:text-sky-300",
  LINKEDIN: "bg-blue-700/10 text-blue-700 ring-blue-700/20 dark:text-blue-300",
  INSTAGRAM: "bg-pink-500/10 text-pink-600 ring-pink-500/20 dark:text-pink-300",
  FACEBOOK: "bg-blue-600/10 text-blue-600 ring-blue-600/20 dark:text-blue-300",
  THREADS: "bg-zinc-950/10 text-zinc-900 ring-zinc-700/20 dark:text-zinc-100",
  YOUTUBE: "bg-red-600/10 text-red-600 ring-red-600/20 dark:text-red-300",
  CAROUSEL: "bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-300",
  COMMUNITY: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300",
  STORY: "bg-violet-500/10 text-violet-700 ring-violet-500/20 dark:text-violet-300",
};

export function PlatformBadge({
  platform,
  className,
}: {
  platform: Platform;
  className?: string;
}) {
  return (
    <Badge className={cn(platformClass[platform], className)} variant="muted">
      {formatPlatform(platform)}
    </Badge>
  );
}
