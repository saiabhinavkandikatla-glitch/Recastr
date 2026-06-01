"use client";

import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  CalendarDays,
  Folder,
  LayoutDashboard,
  ListChecks,
  Settings,
  Sparkles,
} from "lucide-react";
import type { CurrentUser } from "@/lib/current-user";
import { readBrowserScheduledPosts } from "@/lib/browser-schedule-store";
import { cn } from "@/lib/utils";
import type { ApiResponse } from "@/lib/api-response";
import type { Project, ScheduledPost } from "@/lib/types";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, id: "dashboard" },
  { href: "/projects", label: "Projects", icon: Folder, id: "projects" },
  { href: "/schedule", label: "Schedule", icon: CalendarDays, id: "schedule" },
  { href: "/tasks", label: "Tasks", icon: ListChecks, id: "tasks" },
  { href: "/settings", label: "Settings", icon: Settings, id: "settings" },
] as const;

export function Sidebar({
  projects,
  user,
}: {
  projects: Project[];
  user?: CurrentUser | null;
}) {
  const pathname = usePathname();
  const scheduledCount = useScheduledCount(Boolean(user));
  const [tasksPeekOpen, setTasksPeekOpen] = useState(false);
  // Fallback to minimal state if no user, removing "Demo creator" hardcoding
  const displayName = user?.name ?? user?.email?.split("@")[0] ?? "Creator";
  const plan = user?.plan ?? "FREE";

  useEffect(() => {
    if (!pathname.startsWith("/tasks")) return;
    setTasksPeekOpen(true);
    const timeout = window.setTimeout(() => setTasksPeekOpen(false), 2200);
    return () => window.clearTimeout(timeout);
  }, [pathname, scheduledCount]);

  return (
    <>
      <aside className="z-20 hidden h-screen w-[var(--sidebar-width)] shrink-0 flex-col overflow-hidden border-r border-[var(--app-line)] bg-[var(--app-bg)] text-[var(--app-text)] lg:flex">
        <div className="flex h-[var(--topbar-height)] items-center gap-2.5 border-b border-[var(--app-line)] px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--violet)]">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="font-display text-[15px] font-semibold tracking-tight">Recastr</p>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">AI Content Studio</p>
          </div>
        </div>

        <nav className="space-y-1.5 px-3 py-6">
          {navItems.map((item) => (
            <SidebarLink
              key={`${item.href}-${item.label}`}
              active={isActive(pathname, item.href, item.label)}
              badge={item.id === "tasks" ? scheduledCount : 0}
              href={item.href}
              icon={item.icon}
              label={item.label}
              onClick={() => {
                if (item.id === "tasks") {
                  setTasksPeekOpen(true);
                  window.setTimeout(() => setTasksPeekOpen(false), 2200);
                }
              }}
              onMouseEnter={() => {
                if (item.id === "tasks") setTasksPeekOpen(true);
              }}
              onMouseLeave={() => {
                if (item.id === "tasks" && !pathname.startsWith("/tasks")) setTasksPeekOpen(false);
              }}
              popover={
                item.id === "tasks" && tasksPeekOpen ? (
                  <TasksSchedulePeek scheduledCount={scheduledCount} />
                ) : null
              }
            />
          ))}
        </nav>

        <div className="border-y border-[var(--app-line)] px-5 py-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Recent Projects
            </p>
            <span className="text-[11px] font-medium text-muted-foreground">
              {projects.length}
            </span>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-3 py-4 scrollbar-thin">
          {projects.slice(0, 6).map((project) => {
            const active = pathname === `/projects/${project.id}`;
            return (
              <Link
                href={`/projects/${project.id}`}
                key={project.id}
                className={cn(
                  "group relative flex gap-3 rounded-lg border border-transparent p-2 transition-colors duration-200",
                  active
                    ? "border-[var(--app-line-strong)] bg-[var(--app-panel)]"
                    : "hover:bg-[var(--app-surface)]"
                )}
              >
                <div className="relative h-[38px] w-[38px] shrink-0 overflow-hidden rounded-lg">
                  <Image
                    src={project.thumbnailUrl ?? "/og-image.svg"}
                    alt=""
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-black/10" />
                </div>
                <div className="min-w-0 flex-1 flex flex-col justify-center">
                  <p className={cn(
                    "truncate text-[13px] font-medium transition-colors",
                    active ? "text-primary" : "group-hover:text-foreground"
                  )}>{project.title}</p>
                  <p className="mt-0.5 text-[11px] font-medium capitalize text-muted-foreground">
                    {project.sourceType.toLowerCase()}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>

        <div className="border-t border-[var(--app-line)] p-4">
          {user ? (
            <div className="group flex cursor-pointer items-center gap-3 rounded-lg border border-[var(--app-line)] bg-[var(--app-surface)] p-3 transition-colors hover:border-[var(--app-line-strong)]">
              <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--violet)]/15 text-sm font-semibold text-violet-400">
                {displayName.slice(0, 1).toUpperCase()}
                <div className="absolute bottom-0 right-0 h-2 w-2 rounded-full border-[1.5px] border-[var(--app-bg)] bg-emerald-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{displayName}</p>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{plan} plan</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="h-10 rounded-lg bg-white/[0.03] animate-pulse" />
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="fixed inset-x-0 bottom-0 z-50 grid h-16 grid-cols-5 border-t border-[var(--app-line)] bg-[var(--app-bg)] px-2 lg:hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href, item.label);
          const showBadge = item.id === "tasks" && scheduledCount > 0;
          return (
            <Link
              aria-label={item.label}
              className="relative flex flex-col items-center justify-center gap-1 group"
              href={item.href}
              key={`${item.href}-${item.label}-mobile`}
            >
              {active && (
                <motion.div
                  layoutId="mobile-nav-indicator"
                  className="absolute inset-x-4 top-0 h-[3px] rounded-b-md bg-[var(--violet)]"
                />
              )}
              <div className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full transition-all duration-300",
                active ? "bg-[var(--violet)]/15 text-[var(--violet)]" : "text-muted-foreground group-hover:bg-[var(--app-surface)] group-hover:text-foreground"
              )}>
                <Icon className="h-5 w-5" />
                {showBadge ? (
                  <span className="absolute right-[18%] top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--violet)] px-1 text-[10px] font-bold leading-none text-white">
                    {scheduledCount > 9 ? "9+" : scheduledCount}
                  </span>
                ) : null}
              </div>
              <span className={cn(
                "text-[10px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}>
                {item.label.split(' ')[0]}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

function SidebarLink({
  active,
  href,
  icon: Icon,
  label,
  badge = 0,
  onClick,
  onMouseEnter,
  onMouseLeave,
  popover,
}: {
  active: boolean;
  href: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  badge?: number;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  popover?: ReactNode;
}) {
  return (
    <Link
      href={href}
      title={label}
      onClick={onClick}
      onFocus={onMouseEnter}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cn(
        "relative flex h-10 items-center gap-3 rounded-[10px] px-3 text-[14px] font-medium transition-all duration-200 group overflow-visible",
        active
          ? "bg-[var(--app-panel)] text-[var(--violet)]"
          : "text-muted-foreground hover:bg-[var(--app-surface)] hover:text-foreground"
      )}
    >
      {active && (
        <motion.div
          layoutId="sidebar-indicator"
          className="absolute bottom-1.5 left-0 top-1.5 w-[3px] rounded-r-md bg-[var(--violet)]"
          initial={false}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      )}
      <Icon className={cn(
        "h-[18px] w-[18px] transition-colors",
        active ? "text-primary" : "group-hover:text-foreground"
      )} />
      <span className="relative z-10">{label}</span>
      {badge > 0 ? (
        <span className="relative z-10 ml-auto rounded-full bg-primary px-1.5 text-[10px] font-bold leading-4 text-primary-foreground">
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}

      {popover}

      {/* Hover background effect */}
      {!active ? <div className="absolute inset-0 rounded-[10px] opacity-0 transition-opacity group-hover:opacity-100" /> : null}
    </Link>
  );
}

function TasksSchedulePeek({ scheduledCount }: { scheduledCount: number }) {
  return (
    <span className="pointer-events-none absolute left-12 top-[calc(100%+6px)] z-50 hidden rounded-2xl border border-[var(--app-line)] bg-[var(--app-surface)] px-3 py-2 text-left shadow-2xl lg:block">
      <span className="block whitespace-nowrap text-xs font-semibold text-foreground">
        {scheduledCount} scheduled {scheduledCount === 1 ? "task" : "tasks"}
      </span>
      <span className="mt-0.5 block whitespace-nowrap text-[11px] text-muted-foreground">
        Click to open schedule queue
      </span>
    </span>
  );
}

function useScheduledCount(enabled: boolean) {
  const [serverPosts, setServerPosts] = useState<ScheduledPost[]>([]);
  const [localPosts, setLocalPosts] = useState<ScheduledPost[]>([]);

  useEffect(() => {
    function syncLocalPosts() {
      setLocalPosts(readBrowserScheduledPosts().filter(isActiveScheduledPost));
    }

    syncLocalPosts();
    const interval = window.setInterval(syncLocalPosts, 15_000);
    window.addEventListener("storage", syncLocalPosts);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("storage", syncLocalPosts);
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    async function loadScheduledCount() {
      const response = await fetch("/api/scheduled?filter=upcoming", { cache: "no-store" }).catch(() => null);
      if (!response?.ok) return;
      const payload = (await response.json().catch(() => null)) as ApiResponse<ScheduledPost[]> | null;
      if (!payload?.data || cancelled) return;
      setServerPosts(payload.data.filter(isActiveScheduledPost));
    }

    void loadScheduledCount();
    const interval = window.setInterval(() => void loadScheduledCount(), 60_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [enabled]);

  return useMemo(() => {
    const contentIds = new Set<string>();
    const fingerprints = new Set<string>();
    let count = 0;

    const source = enabled ? serverPosts : localPosts;

    for (const post of source) {
      const contentId = post.contentId?.trim();
      const fingerprint = getScheduledFingerprint(post);
      if ((contentId && contentIds.has(contentId)) || (fingerprint && fingerprints.has(fingerprint))) {
        continue;
      }
      if (contentId) contentIds.add(contentId);
      if (fingerprint) fingerprints.add(fingerprint);
      count += 1;
    }

    return count;
  }, [enabled, localPosts, serverPosts]);
}

function isActiveScheduledPost(post: ScheduledPost) {
  return ["PENDING", "SCHEDULED"].includes(post.status.toUpperCase());
}

function getScheduledFingerprint(post: ScheduledPost) {
  const rawDate = post.publishAt ?? post.scheduledAt;
  const date = rawDate ? new Date(rawDate) : null;
  const minuteBucket = date && !Number.isNaN(date.getTime())
    ? Math.floor(date.getTime() / 60_000)
    : rawDate;
  const title = post.title.replace(/\s+/g, " ").trim().toLowerCase().slice(0, 160);
  if (!minuteBucket || !title) return null;
  return `${post.platform}:${minuteBucket}:${title}`;
}

function isActive(pathname: string, href: string, label: string) {
  if (label === "Projects") return pathname.startsWith("/projects");
  if (href === "/dashboard") return pathname === href && label === "Dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}
