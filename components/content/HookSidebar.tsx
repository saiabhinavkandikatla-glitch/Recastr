"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ViralHook } from "@/lib/types";

interface HookSidebarProps {
  hooks: ViralHook[];
  selectedHookId: string | null;
  contentCount: number;
  onSelect: (id: string | null) => void;
}

const sidebarVariants = {
  animate: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const hookVariants = {
  initial: { opacity: 0, x: -6 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: 0.2, ease: [0.16, 1, 0.32, 1] },
};

export const HookSidebar = memo(function HookSidebar({
  hooks,
  selectedHookId,
  contentCount,
  onSelect,
}: HookSidebarProps) {
  return (
    <aside className="w-full shrink-0 min-[700px]:sticky min-[700px]:top-20 min-[700px]:w-[248px]">
      <div className="mb-3 px-1">
        <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Viral hooks
        </p>
      </div>

      <motion.div
        animate="animate"
        className="space-y-2"
        initial="initial"
        variants={sidebarVariants}
      >
        <motion.button
          type="button"
          variants={hookVariants}
          onClick={() => onSelect(null)}
          className={cn(
            "w-full rounded-2xl border border-[var(--app-line)] bg-[var(--app-surface)] px-3 py-3 text-left text-[15px] font-semibold text-card-foreground transition hover:border-[var(--app-line-strong)] hover:bg-[var(--app-panel)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--violet)]",
            selectedHookId === null && "border-[var(--violet)] border-l-[3px] bg-[var(--violet-muted)]",
          )}
        >
          All content ({contentCount})
        </motion.button>

        {hooks.map((hook) => {
          const selected = selectedHookId === hook.id;
          const reach = Math.min(100, Math.max(0, Math.round(hook.reachScore)));
          return (
            <motion.button
              key={hook.id}
              type="button"
              variants={hookVariants}
              onClick={() => onSelect(hook.id)}
              className={cn(
                "group relative w-full overflow-hidden rounded-2xl border border-[var(--app-line)] bg-[var(--app-surface)] p-4 text-left transition hover:border-[var(--app-line-strong)] hover:bg-[var(--app-panel)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--violet)]",
                selected && "border-[var(--violet)] border-l-[3px] bg-[var(--violet-muted)]",
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <span className={cn("rounded-full px-2 py-0.5 text-[12px] font-medium", hookPillClass(hook.hookType))}>
                  {hook.hookType}
                </span>
              </div>
              <p className="mt-3 line-clamp-2 text-[15px] font-semibold leading-[1.45] text-card-foreground">
                {hook.text}
              </p>
              <div className="mt-4 flex items-center gap-3">
                <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-[var(--violet)]"
                    style={{ width: `${reach}%` }}
                  />
                </div>
                <span className="w-6 text-right text-[12px] text-muted-foreground">{reach}</span>
              </div>
            </motion.button>
          );
        })}
      </motion.div>
    </aside>
  );
});

function hookPillClass(type: string) {
  const normalized = type.toLowerCase();
  if (normalized.includes("story")) return "bg-[#d9fff2] text-[#1e614d]";
  if (normalized.includes("data")) return "bg-[#ffe6c4] text-[#7a4c1d]";
  if (normalized.includes("controversy")) return "bg-[#ffd3df] text-[#8a2643]";
  return "bg-[#eee9ff] text-[#4e3996]";
}
