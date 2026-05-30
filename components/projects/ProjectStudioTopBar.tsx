"use client";

import Link from "next/link";
import { ArrowLeft, ChevronDown, Download } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Project } from "@/lib/types";
import { type PlatformFilter, platformFilters } from "./types";

export function ProjectStudioTopBar({
  project,
  platformFilter,
  onPlatformFilterChange,
  exportOpen,
  onExportToggle,
  onGenerateToggle,
}: {
  project: Project;
  platformFilter: PlatformFilter;
  onPlatformFilterChange: (platform: PlatformFilter) => void;
  exportOpen: boolean;
  onExportToggle: () => void;
  onGenerateToggle: () => void;
}) {
  return (
    <div className="sticky top-0 z-20 -mt-4 bg-background/60 backdrop-blur-xl py-4 border-b border-white/5">
      <div className="flex flex-col gap-4 min-[900px]:flex-row min-[900px]:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <Button asChild className="h-9 rounded-lg px-3" variant="ghost">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Link>
          </Button>
          <h1 className="truncate text-lg font-semibold tracking-tight">{project.title}</h1>
        </div>

        <div className="flex flex-wrap gap-2">
          {platformFilters.map((item) => {
            const active = platformFilter === item.value;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => onPlatformFilterChange(item.value)}
                className={filterPillClass(item.value, active)}
              >
                {active ? (
                  <motion.span
                    layoutId="project-platform-filter"
                    className="absolute inset-0 rounded-full bg-[var(--violet)]"
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.32, 1] }}
                  />
                ) : null}
                <span className="relative z-10">{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 min-[900px]:ml-auto">
          <Button className="h-10 rounded-[11px] px-4 text-[15px] font-medium" variant="secondary" onClick={onExportToggle}>
            <Download className="h-4 w-4" />
            Export
            <ChevronDown className={cn("h-3.5 w-3.5 transition", exportOpen && "rotate-180")} />
          </Button>
          <Button onClick={onGenerateToggle} className="h-10 rounded-[11px] bg-[var(--violet)] px-5 text-[15px] font-medium text-white hover:bg-[var(--violet-dark)]">
            + Generate more
          </Button>
        </div>
      </div>
    </div>
  );
}

function filterPillClass(filter: PlatformFilter, active: boolean) {
  const base = "relative h-8 rounded-full border px-4 text-[15px] font-medium transition";
  if (active) return cn(base, "border-[var(--violet)] bg-[var(--violet)] text-white");
  if (filter === "twitter") return cn(base, "border-[var(--twitter)] text-[var(--twitter)] hover:bg-sky-500/10");
  if (filter === "linkedin") return cn(base, "border-[#0A66C2] text-[#0A66C2] hover:bg-[#0A66C2]/10");
  if (filter === "instagram") return cn(base, "border-[var(--instagram)] text-[var(--instagram)] hover:bg-pink-500/10");
  if (filter === "youtube") return cn(base, "border-[var(--youtube)] text-[var(--youtube)] hover:bg-red-500/10");
  return cn(base, "border-[var(--violet)] text-[var(--violet)]");
}
