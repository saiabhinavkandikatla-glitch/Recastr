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
    <div className="sticky top-0 z-30 -mx-2 -mt-6 border-b border-[var(--app-line)] bg-[var(--app-bg)]/95 px-2 py-4 backdrop-blur-md">
      <div className="flex flex-col gap-5 min-[900px]:flex-row min-[900px]:items-center">
        <div className="flex min-w-0 shrink-0 items-center gap-3">
          <Button asChild className="h-9 rounded-full px-3 text-muted-foreground hover:bg-[var(--app-panel)] hover:text-foreground" variant="ghost">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Link>
          </Button>
          <span className="sr-only">{project.title}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
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

        <div className="flex items-center gap-2.5 min-[900px]:ml-auto">
          <Button className="h-10 rounded-full border border-[var(--app-line)] bg-[var(--app-surface)] px-5 text-sm font-semibold hover:bg-[var(--app-panel)]" variant="secondary" onClick={onExportToggle}>
            <Download className="h-4 w-4" />
            Export
            <ChevronDown className={cn("h-3.5 w-3.5 transition", exportOpen && "rotate-180")} />
          </Button>
          <Button onClick={onGenerateToggle} className="h-10 rounded-full bg-[var(--violet)] px-5 text-sm font-semibold text-white hover:bg-[var(--violet-hover)]">
            + Generate more
          </Button>
        </div>
      </div>
    </div>
  );
}

function filterPillClass(filter: PlatformFilter, active: boolean) {
  const base =
    "relative h-10 rounded-full px-5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--violet)] focus-visible:ring-offset-2 focus-visible:ring-offset-background";
  if (active) return cn(base, "bg-[var(--violet)] text-white");
  return cn(
    base,
    "border border-[var(--app-line)] bg-[var(--app-surface)] text-muted-foreground hover:border-[var(--app-line-strong)] hover:bg-[var(--app-panel)] hover:text-foreground",
    filter === "all" && "text-foreground",
  );
}
