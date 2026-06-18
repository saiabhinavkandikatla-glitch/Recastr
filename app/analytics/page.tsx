import { AppShell } from "@/components/layout/AppShell";
import { getCurrentUser } from "@/lib/current-user";
import {
  BarChart3,
  Eye,
  TrendingUp,
  Globe,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

export default async function AnalyticsPage() {
  const user = await getCurrentUser();

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
            icon={Eye}
            label="Total Views"
            value="—"
            change={null}
            hint="Connect platforms to track"
          />
          <StatsCard
            icon={TrendingUp}
            label="Engagement Rate"
            value="—"
            change={null}
            hint="No data yet"
          />
          <StatsCard
            icon={Globe}
            label="Best Performing Platform"
            value="—"
            change={null}
            hint="Publish content to see"
          />
          <StatsCard
            icon={FileText}
            label="Content Published"
            value="0"
            change={null}
            hint="All time"
          />
        </div>

        {/* Bar Chart Placeholder */}
        <div className="rounded-2xl border border-[#232323] bg-[#0F0F0F] p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">
                Content Performance
              </h2>
              <p className="mt-0.5 text-xs text-[#8A8A8A]">
                Views &amp; engagement over the last 30 days
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs text-[#8A8A8A]">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-white" />
                Views
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-[#8A8A8A]" />
                Engagement
              </span>
            </div>
          </div>

          {/* Placeholder bars */}
          <div className="flex h-48 items-end gap-2">
            {Array.from({ length: 14 }).map((_, i) => {
              const h1 = 20 + ((i * 17 + 7) % 60);
              const h2 = 10 + ((i * 11 + 3) % 30);
              return (
                <div
                  key={i}
                  className="flex flex-1 flex-col items-center gap-1"
                >
                  <div
                    className="w-full rounded-t bg-[#232323]"
                    style={{ height: `${h1}%` }}
                  />
                  <div
                    className="w-full rounded-t bg-[#1A1A1A]"
                    style={{ height: `${h2}%` }}
                  />
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-center">
            <p className="text-xs text-[#555]">
              Detailed analytics will appear here once you publish content.
            </p>
          </div>
        </div>

        {/* Recent Performance Table */}
        <div className="rounded-2xl border border-[#232323] bg-[#0F0F0F] p-6">
          <h2 className="mb-4 text-base font-semibold text-white">
            Recent Performance
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#232323] text-[#8A8A8A]">
                  <th className="pb-3 pr-4 font-medium">Content</th>
                  <th className="pb-3 pr-4 font-medium">Platform</th>
                  <th className="pb-3 pr-4 font-medium">Views</th>
                  <th className="pb-3 pr-4 font-medium">Engagement</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td
                    colSpan={5}
                    className="py-12 text-center text-[#555]"
                  >
                    No content performance data yet. Published content will
                    appear here.
                  </td>
                </tr>
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
