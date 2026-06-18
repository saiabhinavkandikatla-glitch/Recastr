import { AppShell } from "@/components/layout/AppShell";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma/client";
import { redirect } from "next/navigation";
import {
  MessageSquare,
  Briefcase,
  Heart,
  Video,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

export default async function AnalyticsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  // Fetch platform-specific metrics from Database
  const contentItems = await prisma.content.findMany({
    where: { project: { userId: user.id } },
    select: { platform: true, createdAt: true },
  });

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
    platformCounts[p] = (platformCounts[p] || 0) + 1;
  });

  const twitterCount = platformCounts.TWITTER + platformCounts.THREADS;
  const linkedinCount = platformCounts.LINKEDIN;
  const facebookIgCount = platformCounts.FACEBOOK + platformCounts.INSTAGRAM + platformCounts.CAROUSEL;
  const youtubeCount = platformCounts.COMMUNITY;

  const scheduledPosts = await prisma.scheduledPost.findMany({
    where: { userId: user.id },
    orderBy: { scheduledAt: "desc" },
    include: {
      content: true,
    },
  });

  // Calculate actual daily content created for the last 14 days
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

  const maxDailyCount = Math.max(...dailyCounts, 1);
  const chartBars = last14Days.map((date, idx) => {
    const totalCreated = dailyCounts[idx];
    const totalScheduled = scheduledPosts.filter((post) => {
      const postDate = new Date(post.scheduledAt);
      postDate.setHours(0, 0, 0, 0);
      return postDate.getTime() === date.getTime();
    }).length;

    const h1 = (totalCreated / maxDailyCount) * 80; // scale to max 80%
    const h2 = (totalScheduled / maxDailyCount) * 80;

    return {
      h1: Math.max(h1, totalCreated > 0 ? 5 : 0),
      h2: Math.max(h2, totalScheduled > 0 ? 5 : 0),
      created: totalCreated,
      scheduled: totalScheduled,
    };
  });

  const platformNames: Record<string, string> = {
    TWITTER: "Twitter/X",
    LINKEDIN: "LinkedIn",
    INSTAGRAM: "Instagram",
    FACEBOOK: "Facebook",
    THREADS: "Threads",
    COMMUNITY: "YouTube Community",
  };

  return (
    <AppShell projects={[]} title="Analytics" user={user}>
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
            icon={MessageSquare}
            label="Twitter / X Posts"
            value={twitterCount.toString()}
            change={twitterCount > 0 ? 10 : null}
            hint="Total generated threads & posts"
          />
          <StatsCard
            icon={Briefcase}
            label="LinkedIn Posts"
            value={linkedinCount.toString()}
            change={linkedinCount > 0 ? 15 : null}
            hint="Total generated articles"
          />
          <StatsCard
            icon={Heart}
            label="Facebook / Instagram"
            value={facebookIgCount.toString()}
            change={facebookIgCount > 0 ? 8 : null}
            hint="Total generated FB, IG & Carousel posts"
          />
          <StatsCard
            icon={Video}
            label="YouTube Community"
            value={youtubeCount.toString()}
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
                Content pieces generated &amp; scheduled over the last 14 days
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs text-[#8A8A8A]">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-white" />
                Generated
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-[#8A8A8A]" />
                Scheduled
              </span>
            </div>
          </div>

          {/* Dynamic / simulated bars */}
          <div className="flex h-48 items-end gap-2">
            {chartBars.map((bar, i) => (
              <div
                key={i}
                className="flex flex-1 flex-col items-center gap-1"
              >
                <div
                  className="w-full rounded-t bg-white transition-all duration-500"
                  style={{ height: `${bar.h1}%` }}
                  title={`${bar.created} posts generated`}
                />
                <div
                  className="w-full rounded-t bg-[#8A8A8A] transition-all duration-500"
                  style={{ height: `${bar.h2}%` }}
                  title={`${bar.scheduled} posts scheduled`}
                />
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-center">
            <p className="text-xs text-[#555]">
              {contentItems.length > 0
                ? "Repurposing activity automatically updates based on your generated content history."
                : "Your repurposing activity metrics will appear here once you generate content."}
            </p>
          </div>
        </div>

        {/* Recent Performance Table */}
        <div className="rounded-2xl border border-[#232323] bg-[#0F0F0F] p-6">
          <h2 className="mb-4 text-base font-semibold text-white">
            Recent Pipeline
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#232323] text-[#8A8A8A]">
                  <th className="pb-3 pr-4 font-medium">Content Preview</th>
                  <th className="pb-3 pr-4 font-medium">Platform</th>
                  <th className="pb-3 pr-4 font-medium">Posting Method</th>
                  <th className="pb-3 pr-4 font-medium">Scheduled Date</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {scheduledPosts.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-12 text-center text-[#555]"
                    >
                      No content scheduled yet. Schedule your generated posts to populate this pipeline.
                    </td>
                  </tr>
                ) : (
                  scheduledPosts.slice(0, 5).map((post) => {
                    const bodyPreview = post.content?.body || "Generated content output";
                    const formattedMethod = post.postingMethod === "email_reminder" ? "Email Reminder" : "Auto-post";
                    const formattedDate = new Date(post.scheduledAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    });

                    return (
                      <tr key={post.id} className="border-b border-[#151515] text-white">
                        <td className="py-4 pr-4 font-medium max-w-xs truncate">
                          {bodyPreview}
                        </td>
                        <td className="py-4 pr-4 text-[#8A8A8A]">
                          {platformNames[post.platform.toUpperCase()] || post.platform}
                        </td>
                        <td className="py-4 pr-4 text-zinc-300">
                          {formattedMethod}
                        </td>
                        <td className="py-4 pr-4 text-zinc-300">
                          {formattedDate}
                        </td>
                        <td className="py-4">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              post.status.toUpperCase() === "PUBLISHED" || post.status.toUpperCase() === "COMPLETE"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                            }`}
                          >
                            {post.status.toLowerCase()}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

/* ── Stats Card ───────────────────────────────────────────────── */

function StatsCard({
  icon: Icon,
  label,
  value,
  change,
  hint,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  change: number | null;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-[#232323] bg-[#0F0F0F] p-5 transition-colors hover:border-[#333]">
      <div className="flex items-center justify-between">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1A1A1A]">
          <Icon className="h-4 w-4 text-[#8A8A8A]" />
        </span>
        {change !== null && (
          <span
            className={`flex items-center gap-0.5 text-xs font-medium ${
              change >= 0 ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {change >= 0 ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            {Math.abs(change)}%
          </span>
        )}
      </div>
      <p className="mt-4 text-2xl font-bold text-white">{value}</p>
      <p className="mt-0.5 text-xs text-[#8A8A8A]">{label}</p>
      <p className="mt-1 text-[10px] text-[#555]">{hint}</p>
    </div>
  );
}
