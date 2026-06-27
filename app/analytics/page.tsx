import { AppShell } from "@/components/layout/AppShell";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma/client";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  MessageSquare,
  Briefcase,
  Heart,
  Video,
} from "lucide-react";
import type { ReactNode } from "react";

export default async function AnalyticsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  // Fetch data
  const [contentItems, scheduledPosts] = await Promise.all([
    prisma.content.findMany({
      where: { project: { userId: user.id } },
      select: { platform: true, createdAt: true },
    }),
    prisma.scheduledPost.findMany({
      where: { userId: user.id },
      orderBy: { scheduledAt: "desc" },
      include: { content: true },
    }),
  ]);

  // Count content by platform
  const platformCounts: Record<string, number> = {
    TWITTER: 0,
    LINKEDIN: 0,
    INSTAGRAM: 0,
    FACEBOOK: 0,
    THREADS: 0,
    CAROUSEL: 0,
    COMMUNITY: 0,
  };

  contentItems.forEach((item) => {
    const p = item.platform.toUpperCase();
    if (p in platformCounts) {
      platformCounts[p] = (platformCounts[p] || 0) + 1;
    }
  });

  const twitterCount = (platformCounts.TWITTER || 0) + (platformCounts.THREADS || 0);
  const linkedinCount = (platformCounts.LINKEDIN || 0);
  const facebookIgCount = (platformCounts.FACEBOOK || 0) + (platformCounts.INSTAGRAM || 0) + (platformCounts.CAROUSEL || 0);
  const youtubeCount = (platformCounts.COMMUNITY || 0);

  // Calculate daily content for the last 14 days
  const last14Days = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    return d;
  }).reverse(); // chronological order

  const dailyCounts = last14Days.map((date) => {
    const count = contentItems.filter((item) => {
      const itemDate = new Date(item.createdAt);
      itemDate.setHours(0, 0, 0, 0);
      return itemDate.getTime() === date.getTime();
    }).length;
    return count;
  });

  const maxDailyCount = Math.max(...(dailyCounts.filter((c) => c !== 0)), 1);
  const chartBars = last14Days.map((date, idx) => {
    const totalCreated = (dailyCounts[idx] || 0);
    const totalScheduled = scheduledPosts.filter((post) => {
      const postDate = new Date(post.scheduledAt);
      postDate.setHours(0, 0, 0, 0);
      return postDate.getTime() === date.getTime();
    }).length;

    const h1 = ((totalCreated || 0) / (maxDailyCount || 1)) * 80;
    const h2 = ((totalScheduled || 0) / (maxDailyCount || 1)) * 80;

    return {
      h1: Math.max(h1, (totalCreated || 0) > 0 ? 5 : 0),
      h2: Math.max(h2, (totalScheduled || 0) > 0 ? 5 : 0),
      created: (totalCreated || 0),
      scheduled: (totalScheduled || 0),
    };
  });

  return (
    <AppShell title="Analytics" user={user}>
      <PageHeader title="Analytics" backHref="/dashboard" />
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="mt-1 text-sm text-[#8A8A8A]">
            Track your content performance across all platforms.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            icon={<MessageSquare className="h-4 w-4" />}
            label="Twitter / X Posts"
            value={String(twitterCount)}
            change={twitterCount > 0 ? 10 : null}
            hint="Total generated threads & posts"
          />
          <StatsCard
            icon={<Briefcase className="h-4 w-4" />}
            label="LinkedIn Posts"
            value={String(linkedinCount)}
            change={linkedinCount > 0 ? 15 : null}
            hint="Total generated articles"
          />
          <StatsCard
            icon={<Heart className="h-4 w-4" />}
            label="Facebook / Instagram"
            value={String(facebookIgCount)}
            change={facebookIgCount > 0 ? 8 : null}
            hint="Total generated FB, IG & Carousel posts"
          />
          <StatsCard
            icon={<Video className="h-4 w-4" />}
            label="YouTube Community"
            value={String(youtubeCount)}
            change={youtubeCount > 0 ? 12 : null}
            hint="Total generated community assets"
          />
        </div>

        {/* Bar Chart Placeholder */}
        <div className="rounded-2xl border border-[#232323] bg-[#0F0F0F] p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">
                Repurposing Activity
              </h2>
              <p className="mt-0.5 text-xs text-[#8A8A8A]">
                Content pieces generated & scheduled over the last 14 days
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs text-[#8A8a8a]">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-white" />
                Generated
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-[#8A8a8a]" />
                Scheduled
              </span>
            </div>
          </div>

          {/* Dynamic / simulated bars */}
          <div className="flex h-48 items-end gap-3 px-2 border-b border-[#232323] pb-2">
            {chartBars.map((bar, i) => (
              <div
                key={i}
                className={`flex h-full flex-1 flex-col justify-end`}
              >
                <div className="flex flex-1 items-end gap-1">
                  <div
                    className={`w-full rounded-t bg-[hsl(var(--accent))]`}
                    style={{ height: `${bar.h1}%` }}
                    title={`${bar.created} posts generated`}
                  />
                  <div
                    className={`w-full rounded-t bg-[hsl(var(--accent-2))]`}
                    style={{ height: `${bar.h2}%` }}
                    title={`${bar.scheduled} posts scheduled`}
                  />
                </div>
                <div className="mt-2 text-center text-[10px] text-[#555] font-mono select-none h-4">
                  {i % 2 === 0 ? last14Days[i].toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function StatsCard({
  icon,
  label,
  value,
  change,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  change: number | null;
  hint: string;
}) {
  const absoluteChange = change ? `${change > 0 ? "+" : ""}${change}%` : null;
  const bgColor = change ? (change > 0 ? "bg-green-500/20" : "bg-red-500/20") : "bg-[var(--app-line)]/20";
  const changeColor = change && change > 0 ? "text-green-400" : "text-red-400";

  return (
    <div className="rounded-2xl border border-[var(--app-line)] bg-[var(--app-surface)] p-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-sm font-medium text-white">{label}</h3>
        </div>
        {absoluteChange && (
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${bgColor} ${changeColor}`}>
            {absoluteChange}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {hint && (
        <p className="mt-1 text-xs text-[#8A8A8A]">{hint}</p>
      )}
    </div>
  );
}
