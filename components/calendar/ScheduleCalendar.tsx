"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isBefore,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MailCheck,
  Plus,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { readBrowserScheduledPosts } from "@/lib/browser-schedule-store";
import { cn } from "@/lib/utils";
import type { Platform, ScheduledPost } from "@/lib/types";

type ViewMode = "month" | "week" | "day";

const activeStatuses = new Set<ScheduledPost["status"]>(["SCHEDULED", "PENDING"]);
const historyStatuses = new Set<ScheduledPost["status"]>(["NOTIFIED", "PUBLISHED", "FAILED", "CANCELLED", "COMPLETE"]);

export function ScheduleCalendar({ scheduledPosts }: { scheduledPosts: ScheduledPost[] }) {
  const [cursor, setCursor] = useState(new Date());
  const [view, setView] = useState<ViewMode>("month");
  const posts = useMemo(
    () => mergeScheduledPosts(scheduledPosts, readBrowserScheduledPosts()),
    [scheduledPosts],
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const syncMobileView = () => {
      if (mediaQuery.matches) setView((current) => (current === "month" ? "day" : current));
    };

    syncMobileView();
    mediaQuery.addEventListener("change", syncMobileView);
    return () => mediaQuery.removeEventListener("change", syncMobileView);
  }, []);

  const activePosts = useMemo(() => posts.filter(isActivePost), [posts]);
  const historyPosts = useMemo(() => posts.filter(isHistoryPost), [posts]);
  const visibleDays = useMemo(() => getVisibleDays(cursor, view), [cursor, view]);
  const upcomingPosts = useMemo(
    () =>
      activePosts
        .filter((post) => !isBefore(getPostDate(post), startOfDay(new Date())))
        .slice(0, 8),
    [activePosts],
  );

  const todayCount = useMemo(
    () => activePosts.filter((post) => isSameDay(getPostDate(post), new Date())).length,
    [activePosts],
  );

  const weekRange = useMemo(
    () => ({
      start: startOfWeek(new Date()),
      end: endOfWeek(new Date()),
    }),
    [],
  );

  const weekCount = useMemo(
    () =>
      activePosts.filter((post) => {
        const date = getPostDate(post);
        return date >= weekRange.start && date <= weekRange.end;
      }).length,
    [activePosts, weekRange],
  );

  function move(direction: "prev" | "next") {
    setCursor((current) => {
      if (view === "month") return direction === "next" ? addMonths(current, 1) : subMonths(current, 1);
      if (view === "week") return direction === "next" ? addWeeks(current, 1) : subWeeks(current, 1);
      return addDays(current, direction === "next" ? 1 : -1);
    });
  }

  const headingLabel = getHeadingLabel(cursor, view);
  const dayLabel = view === "day" ? [format(cursor, "EEEE")] : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-3xl border border-[var(--app-line)] bg-[var(--app-surface)]">
        <div className="flex flex-col gap-3 border-b border-[var(--app-line)] px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="mb-1.5 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5 text-primary" />
              Planner
            </div>
            <h2 className="truncate font-display text-xl font-semibold tracking-tight">{headingLabel}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <StatPill label="Scheduled" value={activePosts.length} />
              <StatPill label="Today" value={todayCount} />
              <StatPill label="Week" value={weekCount} />
              <StatPill label="Sent" value={historyPosts.filter((post) => post.status === "NOTIFIED").length} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 sm:items-center lg:justify-end">
            <div className="inline-flex rounded-full border border-[var(--app-line)] bg-[var(--app-bg)] p-1">
              {(["month", "week", "day"] as const).map((option) => (
                <button
                  className={cn(
                    "relative h-8 min-w-16 rounded-full px-3 text-xs font-semibold capitalize transition-colors",
                    view === option ? "text-black" : "text-muted-foreground hover:text-foreground",
                  )}
                  key={option}
                  onClick={() => setView(option)}
                  type="button"
                >
                  {view === option ? (
                    <motion.span
                      className="absolute inset-0 rounded-full bg-[var(--violet)]"
                      layoutId="schedule-view-active"
                      transition={{ duration: 0.2, ease: [0.16, 1, 0.32, 1] }}
                    />
                  ) : null}
                  <span className="relative">{option}</span>
                </button>
              ))}
            </div>

            <div className="inline-flex rounded-full border border-[var(--app-line)] bg-[var(--app-bg)] p-1">
              <Button
                aria-label="Previous period"
                className="h-8 w-8 rounded-full"
                onClick={() => move("prev")}
                size="icon"
                variant="ghost"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                className="h-8 rounded-full px-3 text-xs"
                onClick={() => setCursor(new Date())}
                size="sm"
                variant="ghost"
              >
                Today
              </Button>
              <Button
                aria-label="Next period"
                className="h-8 w-8 rounded-full"
                onClick={() => move("next")}
                size="icon"
                variant="ghost"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <Button asChild className="h-9 rounded-full bg-[var(--violet)] px-4 text-xs text-black hover:bg-[var(--violet-hover)]">
              <Link href="/dashboard#source-ingest">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Create post
              </Link>
            </Button>
          </div>
        </div>

        <div className="border-b border-[var(--app-line)] p-2.5 md:hidden">
          <MobileScheduleAgenda historyPosts={historyPosts} upcomingPosts={upcomingPosts} />
        </div>

        <div className="hidden gap-0 md:grid xl:grid-cols-[minmax(0,1fr)_292px]">
          <div className="min-w-0">
            <div
              className={cn(
                "hidden border-b border-[var(--app-line)] bg-[var(--app-bg)]/45 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground md:grid",
                view === "day" ? "grid-cols-1" : "grid-cols-7",
              )}
            >
              {dayLabel.map((day) => (
                <div className="px-2 py-2" key={day}>
                  {day}
                </div>
              ))}
            </div>

            <div className={cn("grid", view === "day" ? "grid-cols-1" : "grid-cols-1 md:grid-cols-7")}>
              {visibleDays.map((day) => {
                const dayPosts = activePosts.filter((post) => isSameDay(getPostDate(post), day));
                const today = isSameDay(day, new Date());
                const currentMonth = isSameMonth(day, cursor) || view !== "month";

                return (
                  <CalendarDay
                    currentMonth={currentMonth}
                    day={day}
                    key={day.toISOString()}
                    posts={dayPosts}
                    today={today}
                    view={view}
                  />
                );
              })}
            </div>
          </div>

          <aside className="border-t border-[var(--app-line)] bg-[var(--app-bg)]/35 xl:border-l xl:border-t-0">
            <div className="space-y-4 p-3">
              <PanelBlock
                action={
                  <Button asChild className="h-7 rounded-md px-2.5 text-[11px]" size="sm" variant="outline">
                    <Link href="/tasks?tab=scheduled">Open tasks</Link>
                  </Button>
                }
                icon={<Clock3 className="h-4 w-4 text-primary" />}
                subtitle="Next reminders in order"
                title="Upcoming"
              >
                {upcomingPosts.length ? (
                  <div className="space-y-2">
                    {upcomingPosts.map((post) => (
                      <AgendaItem key={post.id} post={post} />
                    ))}
                  </div>
                ) : (
                  <EmptyPanel
                    body="Schedule any content card and it will appear here."
                    title="Nothing scheduled"
                  />
                )}
              </PanelBlock>

              <PanelBlock
                icon={<MailCheck className="h-4 w-4 text-emerald-400" />}
                subtitle="Recently notified, failed, or cancelled"
                title="Email activity"
              >
                {historyPosts.length ? (
                  <div className="space-y-2">
                    {historyPosts.slice(0, 5).map((post) => (
                      <HistoryItem key={post.id} post={post} />
                    ))}
                  </div>
                ) : (
                  <EmptyPanel
                    body="Email reminders move here after their scheduled time arrives."
                    title="No activity yet"
                  />
                )}
              </PanelBlock>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}

function MobileScheduleAgenda({
  historyPosts,
  upcomingPosts,
}: {
  historyPosts: ScheduledPost[];
  upcomingPosts: ScheduledPost[];
}) {
  return (
    <div className="space-y-2">
      <PanelBlock
        action={
          <Button asChild className="h-7 rounded-md px-2.5 text-[11px]" size="sm" variant="outline">
            <Link href="/tasks?tab=scheduled">Open tasks</Link>
          </Button>
        }
        icon={<Clock3 className="h-4 w-4 text-primary" />}
        subtitle="Next reminders in order"
        title="Upcoming"
      >
        {upcomingPosts.length ? (
          <div className="space-y-2">
            {upcomingPosts.slice(0, 5).map((post) => (
              <AgendaItem key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <EmptyPanel
            body="Schedule any content card and it will appear here."
            title="Nothing scheduled"
          />
        )}
      </PanelBlock>

      <PanelBlock
        icon={<MailCheck className="h-4 w-4 text-emerald-400" />}
        subtitle="Recently notified, failed, or cancelled"
        title="Email activity"
      >
        {historyPosts.length ? (
          <div className="space-y-2">
            {historyPosts.slice(0, 3).map((post) => (
              <HistoryItem key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <EmptyPanel
            body="Email reminders move here after their scheduled time arrives."
            title="No activity yet"
          />
        )}
      </PanelBlock>
    </div>
  );
}

function CalendarDay({
  currentMonth,
  day,
  posts,
  today,
  view,
}: {
  currentMonth: boolean;
  day: Date;
  posts: ScheduledPost[];
  today: boolean;
  view: ViewMode;
}) {
  const visiblePosts = view === "month" ? posts.slice(0, 2) : posts;
  const hiddenCount = posts.length - visiblePosts.length;

  return (
    <div
      className={cn(
        "group min-h-[78px] border-b border-[var(--app-line)] p-2 transition-colors md:border-r md:border-[var(--app-line)]",
        view === "day" && "min-h-[260px]",
        view === "week" && "min-h-[170px]",
        currentMonth ? "bg-[var(--app-surface)] hover:bg-[var(--app-panel)]/65" : "bg-[var(--app-bg)]/35 text-muted-foreground/60",
        today && "bg-[var(--violet-muted)]",
      )}
    >
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground md:hidden">
            {format(day, "EEE")}
          </p>
          <span
            className={cn(
              "mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
              today ? "bg-primary text-primary-foreground" : "text-foreground",
            )}
          >
            {format(day, "d")}
          </span>
        </div>

        {posts.length ? (
          <Badge className="h-5 rounded-full border-[var(--app-line)] bg-[var(--app-panel)] px-1.5 text-[10px] text-muted-foreground" variant="muted">
            {posts.length}
          </Badge>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <AnimatePresence initial={false}>
          {visiblePosts.map((post, index) => (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              initial={{ opacity: 0, y: 8 }}
              key={post.id}
              transition={{ delay: index * 0.03, duration: 0.18 }}
            >
              <CalendarPostChip dense={view === "month"} post={post} />
            </motion.div>
          ))}
        </AnimatePresence>

        {hiddenCount > 0 ? (
          <p className="rounded-md border border-[var(--app-line)] bg-[var(--app-panel)] px-1.5 py-0.5 text-center text-[10px] font-medium text-[var(--violet)]">
            +{hiddenCount} more
          </p>
        ) : null}

        {!posts.length ? (
          <p className="hidden rounded-md border border-dashed border-[var(--app-line)] px-2 py-2 text-center text-[10px] text-muted-foreground group-hover:block">
            Empty
          </p>
        ) : null}
      </div>
    </div>
  );
}

function CalendarPostChip({ dense, post }: { dense: boolean; post: ScheduledPost }) {
  const date = getPostDate(post);

  return (
    <div className="rounded-lg border border-[var(--app-line)] bg-[var(--app-bg)]/70 px-2 py-1.5 transition-colors hover:border-[var(--app-line-strong)]">
      <div className="flex min-w-0 items-center gap-2">
        <span className={cn("h-2 w-2 shrink-0 rounded-full", platformDot(post.platform))} />
        <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{format(date, "h:mm a")}</span>
        <span className="truncate text-[11px] font-medium text-foreground">{platformLabel(post.platform)}</span>
      </div>
      <p className={cn("mt-0.5 text-[11px] leading-4 text-muted-foreground", dense ? "line-clamp-1" : "line-clamp-3")}>
        {post.title}
      </p>
    </div>
  );
}

function AgendaItem({ post }: { post: ScheduledPost }) {
  const date = getPostDate(post);

  return (
    <div className="rounded-xl border border-[var(--app-line)] bg-[var(--app-surface)] p-2.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className={cn("h-2 w-2 shrink-0 rounded-full", platformDot(post.platform))} />
          <p className="truncate text-xs font-semibold">{platformLabel(post.platform)}</p>
        </div>
        <p className="shrink-0 font-mono text-[10px] text-muted-foreground">{format(date, "MMM d, h:mm a")}</p>
      </div>
      <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-muted-foreground">{post.title}</p>
    </div>
  );
}

function HistoryItem({ post }: { post: ScheduledPost }) {
  return (
    <div className="rounded-xl border border-[var(--app-line)] bg-[var(--app-surface)] p-2.5">
      <div className="mb-1 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className={cn("h-2 w-2 shrink-0 rounded-full", platformDot(post.platform))} />
          <p className="truncate text-xs font-semibold">{platformLabel(post.platform)}</p>
        </div>
        <StatusPill status={post.status} />
      </div>
      <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">{post.title}</p>
    </div>
  );
}

function EmptyPanel({ body, title }: { body: string; title: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--app-line)] bg-[var(--app-bg)]/55 p-2.5">
      <p className="text-xs font-semibold">{title}</p>
      <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">{body}</p>
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex h-6 items-center gap-1.5 rounded-full border border-[var(--app-line)] bg-[var(--app-bg)]/55 px-2.5 text-[11px]">
      <span className="font-semibold text-foreground">{value}</span>
      <span>{label}</span>
    </span>
  );
}

function PanelBlock({
  action,
  children,
  icon,
  subtitle,
  title,
}: {
  action?: React.ReactNode;
  children: React.ReactNode;
  icon: React.ReactNode;
  subtitle: string;
  title: string;
}) {
  return (
    <section>
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[var(--app-line)] bg-[var(--app-panel)]">
            {icon}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold">{title}</h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function StatusPill({ status }: { status: ScheduledPost["status"] }) {
  if (status === "NOTIFIED") {
    return <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-300">Email sent</Badge>;
  }
  if (status === "FAILED") {
    return <Badge className="border-red-500/20 bg-red-500/10 text-red-300">Failed</Badge>;
  }
  if (status === "CANCELLED") {
    return <Badge className="border-[var(--app-line)] bg-[var(--app-panel)] text-muted-foreground">Cancelled</Badge>;
  }
  return <Badge className="border-primary/20 bg-primary/10 text-primary">Done</Badge>;
}

function getVisibleDays(cursor: Date, view: ViewMode) {
  if (view === "day") return [cursor];
  if (view === "week") {
    return eachDayOfInterval({
      start: startOfWeek(cursor),
      end: endOfWeek(cursor),
    });
  }
  return eachDayOfInterval({
    start: startOfWeek(startOfMonth(cursor)),
    end: endOfWeek(endOfMonth(cursor)),
  });
}

function getHeadingLabel(cursor: Date, view: ViewMode) {
  if (view === "day") return format(cursor, "EEEE, MMMM d");
  if (view === "week") {
    const start = startOfWeek(cursor);
    const end = endOfWeek(cursor);
    return `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`;
  }
  return format(cursor, "MMMM yyyy");
}

function isActivePost(post: ScheduledPost) {
  return activeStatuses.has(post.status);
}

function isHistoryPost(post: ScheduledPost) {
  return historyStatuses.has(post.status);
}

function getPostDate(post: ScheduledPost) {
  return new Date(post.publishAt ?? post.scheduledAt ?? new Date().toISOString());
}

function platformDot(platform: Platform) {
  if (platform === "TWITTER") return "bg-[var(--platform-twitter)]";
  if (platform === "LINKEDIN") return "bg-[var(--platform-linkedin)]";
  if (platform === "INSTAGRAM" || platform === "CAROUSEL" || platform === "STORY") return "bg-[var(--platform-instagram)]";
  if (platform === "FACEBOOK") return "bg-blue-500";
  if (platform === "THREADS") return "bg-zinc-200";
  return "bg-[var(--platform-youtube)]";
}

function platformLabel(platform: Platform) {
  if (platform === "TWITTER") return "Twitter / X";
  if (platform === "LINKEDIN") return "LinkedIn";
  if (platform === "INSTAGRAM" || platform === "CAROUSEL" || platform === "STORY") return "Instagram";
  if (platform === "FACEBOOK") return "Facebook";
  if (platform === "THREADS") return "Threads";
  return "YouTube Community";
}

function mergeScheduledPosts(current: ScheduledPost[], incoming: ScheduledPost[]) {
  const map = new Map(current.map((post) => [post.contentId ?? post.id, post]));
  for (const post of incoming) {
    map.set(post.contentId ?? post.id, post);
  }
  return Array.from(map.values()).sort((a, b) => getPostDate(a).getTime() - getPostDate(b).getTime());
}
