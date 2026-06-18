"use client";

interface MetricCardProps {
  label: string;
  value: string;
  change: string;
  trend: "up" | "down" | "neutral";
}

export function MetricCard({ label, value, change, trend }: MetricCardProps) {
  const trendColor = trend === "up" ? "text-emerald-500" : trend === "down" ? "text-red-500" : "text-[#8A8A8A]";

  return (
    <div className="flex flex-col justify-between rounded-[32px] border border-[#232323] bg-[#151515] p-8 transition-colors hover:bg-[#1A1A1A]">
      <span className="text-sm font-medium text-[#8A8A8A]">{label}</span>
      <div className="mt-8 flex flex-col gap-1">
        <span className="text-4xl font-semibold tracking-tight text-white">{value}</span>
        <span className={`text-sm font-medium ${trendColor}`}>{change}</span>
      </div>
    </div>
  );
}
