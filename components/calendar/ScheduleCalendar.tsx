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
  Send,
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
    <div className="space-y-6">
      <section className="rounded-[24px] border border-white/10 bg-card/60 p-4 shadow-soft sm:p-5">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              <CalendarDays className="h-3.5 w-3.5" />
              Schedule
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Calendar and email reminders
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Plan posts by date, then Recastr sends the reminder email when it is time to publish manually.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-4 xl:min-w-[540px]">
            <MetricCard label="Scheduled" value={activePosts.length} />
            <MetricCard label="Today" value={todayCount} />
            <MetricCard label="This week" value={weekCount} />
            <MetricCard label="Email sent" value={historyPosts.filter((post) => post.status === "NOTIFIED").length} />
          </div>
        </div>
      </section>

      <section className="rounded-[24px] border border-white/10 bg-card/50 shadow-soft">
        <div className="flex flex-col gap-4 border-b border-white/10 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Current view
            </p>
            <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight">{headingLabel}</h2>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="inline-flex rounded-2xl border border-white/10 bg-background/50 p-1">
              {(["month", "week", "day"] as const).map((option) => (
                <button
                  className={cn(
                    "relative h-9 min-w-20 rounded-xl px-4 text-sm font-medium capitalize transition-colors",
                    view === option ? "text-white" : "text-muted-foreground hover:text-foreground",
                  )}
                  key={option}
                  onClick={() => setView(option)}
                  type="button"
                >
                  {view === option ? (
                    <motion.span
                      className="absolute inset-0 rounded-xl bg-primary"
                      layoutId="schedule-view-active"
                      transition={{ duration: 0.2, ease: [0.16, 1, 0.32, 1] }}
                    />
                  ) : null}
                  <span className="relative">{option}</span>
                </button>
              ))}
            </div>

            <div className="inline-flex rounded-2xl border border-white/10 bg-background/50 p-1">
              <Button
                aria-label="Previous period"
                className="h-9 w-9 rounded-xl"
                onClick={() => move("prev")}
                size="icon"
                variant="ghost"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                className="h-9 rounded-xl px-4"
                onClick={() => setCursor(new Date())}
                size="sm"
                variant="ghost"
              >
                Today
              </Button>
              <Button
                aria-label="Next period"
                className="h-9 w-9 rounded-xl"
                onClick={() => move("next")}
                size="icon"
                variant="ghost"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <Button asChild className="h-10 rounded-xl bg-primary px-4 text-white hover:bg-primary/90">
              <Link href="/dashboard#source-ingest">
                <Plus className="mr-2 h-4 w-4" />
                Create post
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0">
            <div
              className={cn(
                "hidden border-b border-white/10 bg-muted/20 text-center text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground md:grid",
                view === "day" ? "grid-cols-1" : "grid-cols-7",
              )}
            >
              {dayLabel.map((day) => (
                <div className="px-3 py-3" key={day}>
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

          <aside className="border-t border-white/10 bg-background/30 xl:border-l xl:border-t-0">
            <div className="space-y-5 p-4">
              <PanelBlock
                action={
                  <Button asChild className="h-8 rounded-lg px-3 text-xs" size="sm" variant="outline">
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
  const visiblePosts = view === "month" ? posts.slice(0, 3) : posts;
  const hiddenCount = posts.length - visiblePosts.length;

  return (
    <div
      className={cn(
        "group min-h-[132px] border-b border-white/10 p-3 transition-colors md:border-r",
        view === "day" && "min-h-[460px]",
        currentMonth ? "bg-card/30 hover:bg-muted/20" : "bg-background/40 text-muted-foreground/70",
        today && "bg-primary/5",
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground md:hidden">
            {format(day, "EEE")}
          </p>
          <span
            className={cn(
              "mt-1 flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold",
              today ? "bg-primary text-white" : "text-foreground",
            )}
          >
            {format(day, "d")}
          </span>
        </div>

        {posts.length ? (
          <Badge className="bg-background/70 text-muted-foreground ring-white/10" variant="muted">
            {posts.length}
          </Badge>
        ) : null}
      </div>

      <div className="space-y-2">
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
          <p className="rounded-lg border border-primary/20 bg-primary/10 px-2 py-1 text-center text-xs font-medium text-primary">
            +{hiddenCount} more
          </p>
        ) : null}

        {!posts.length ? (
          <p className="hidden rounded-lg border border-dashed border-white/10 px-2 py-3 text-center text-xs text-muted-foreground group-hover:block">
            No reminder
          </p>
        ) : null}
      </div>
    </div>
  );
}

function CalendarPostChip({ dense, post }: { dense: boolean; post: ScheduledPost }) {
  const date = getPostDate(post);

  return (
    <div className="rounded-xl border border-white/10 bg-background/80 p-2 shadow-soft transition-colors hover:border-primary/30">
      <div className="flex min-w-0 items-center gap-2">
        <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", platformDot(post.platform))} />
        <span className="shrink-0 font-mono text-[11px] text-muted-foreground">{format(date, "h:mm a")}</span>
        <span className="truncate text-xs font-semibold text-foreground">{platformLabel(post.platform)}</span>
      </div>
      <p className={cn("mt-1 text-xs leading-5 text-muted-foreground", dense ? "line-clamp-2" : "line-clamp-4")}>
        {post.title}
      </p>
    </div>
  );
}

function AgendaItem({ post }: { post: ScheduledPost }) {
  const date = getPostDate(post);

  return (
    <div className="rounded-2xl border border-white/10 bg-background/70 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", platformDot(post.platform))} />
          <p className="truncate text-sm font-semibold">{platformLabel(post.platform)}</p>
        </div>
        <p className="shrink-0 font-mono text-xs text-muted-foreground">{format(date, "MMM d, h:mm a")}</p>
      </div>
      <p className="mt-2 line-clamp-2 text-sm leading-5 text-muted-foreground">{post.title}</p>
    </div>
  );
}

function HistoryItem({ post }: { post: ScheduledPost }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-background/70 p-3">
      <div className="mb-1 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", platformDot(post.platform))} />
          <p className="truncate text-sm font-semibold">{platformLabel(post.platform)}</p>
        </div>
        <StatusPill status={post.status} />
      </div>
      <p className="line-clamp-2 text-sm leading-5 text-muted-foreground">{post.title}</p>
    </div>
  );
}

function EmptyPanel({ body, title }: { body: string; title: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-background/50 p-5 text-center">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Send className="h-4 w-4" />
      </div>
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{body}</p>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-background/50 px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold">{value}</p>
    </div>
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
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-muted/50">
            {icon}
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold">{title}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
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
    return <Badge className="border-white/10 bg-muted text-muted-foreground">Cancelled</Badge>;
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
  return "YouTube";
}

function mergeScheduledPosts(current: ScheduledPost[], incoming: ScheduledPost[]) {
  const map = new Map(current.map((post) => [post.contentId ?? post.id, post]));
  for (const post of incoming) {
    map.set(post.contentId ?? post.id, post);
  }
  return Array.from(map.values()).sort((a, b) => getPostDate(a).getTime() - getPostDate(b).getTime());
}
