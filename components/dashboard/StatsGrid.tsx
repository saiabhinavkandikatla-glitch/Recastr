"use client";

import { Card } from "@/components/ui/card";
import { Sparkles, FolderOpen, Video, FileText } from "lucide-react";

const stats = [
  {
    label: "Projects Created",
    value: "24",
    change: "+12%",
    icon: FolderOpen,
  },
  {
    label: "Total Generations",
    value: "156",
    change: "+24%",
    icon: Sparkles,
  },
  {
    label: "Videos Processed",
    value: "18",
    change: "+8%",
    icon: Video,
  },
  {
    label: "Words Generated",
    value: "42.5k",
    change: "+18%",
    icon: FileText,
  },
];

export function StatsGrid() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, i) => {
        const Icon = stat.icon;
        return (
          <Card key={i} className="flex flex-col justify-between p-6 bg-[#090909] border-[#232323]">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[#8A8A8A]">
                {stat.label}
              </span>
              <Icon className="h-4 w-4 text-[#8A8A8A]" />
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-semibold text-white">
                {stat.value}
              </span>
              <span className="text-sm font-medium text-emerald-500">
                {stat.change}
              </span>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
