"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { format, isSameDay, isThisWeek, isToday } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarDays, CheckCircle2, Clock3, Copy, Eye, History, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  isBrowserScheduledPostId,
  readBrowserScheduledPosts,
  updateBrowserScheduledPost,
} from "@/lib/browser-schedule-store";
import { cn } from "@/lib/utils";
import type { ContentPiece, Platform, Project, ScheduledPost } from "@/lib/types";
import { PlatformIcon } from "@/components/PlatformIcon";

type TaskTab = "scheduled" | "history";
type ScheduledFilter = "upcoming" | "today" | "week" | "all";
type ScheduledListResponse = {
  data?: ScheduledPost[];
  error?: { message?: string };
};
type HistoryListResponse = {
  data?: {
    items: ScheduledPost[];
  };
  error?: { message?: string };
};
const HISTORY_STATUSES = ["NOTIFIED", "PUBLISHED", "FAILED", "CANCELLED"] as const;
const SCHEDULED_STATUSES = ["SCHEDULED", "PENDING"] as const;

export function TasksWorkspace({
  projects,
  scheduledPosts,
}: {
  projects: Project[];
  scheduledPosts: ScheduledPost[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [tab, setTab] = useState<TaskTab>(() => parseTaskTab(tabParam));
  const [scheduledFilter, setScheduledFilter] = useState<ScheduledFilter>("upcoming");
  const [localScheduled, setLocalScheduled] = useState(() =>
    mergeScheduledPosts(scheduledPosts, readBrowserScheduledPosts()),
  );
  const [scheduledLoading, setScheduledLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const contentIndex = useMemo(() => buildContentIndex(projects), [projects]);
  const scheduledItems = useMemo(
    () =>
      localScheduled
        .filter((post) => SCHEDULED_STATUSES.includes(post.status as (typeof SCHEDULED_STATUSES)[number]))
        .filter((post) => matchesScheduledFilter(post, scheduledFilter))
        .sort((a, b) => new Date(a.publishAt).getTime() - new Date(b.publishAt).getTime()),
    [localScheduled, scheduledFilter],
  );
  const historyItems = useMemo(
    () =>
      localScheduled
        .filter((post) => HISTORY_STATUSES.includes(post.status as (typeof HISTORY_STATUSES)[number]))
        .sort((a, b) => new Date(b.publishAt).getTime() - new Date(a.publishAt).getTime()),
    [localScheduled],
  );

  useEffect(() => {
    setTab(parseTaskTab(tabParam));
  }, [tabParam]);

  useEffect(() => {
    setLocalScheduled((current) => mergeScheduledPosts(current, scheduledPosts));
  }, [scheduledPosts]);

  useEffect(() => {
    setLocalScheduled((current) => mergeScheduledPosts(current, readBrowserScheduledPosts()));
  }, []);

  useEffect(() => {
    if (tab !== "scheduled") return;
    let cancelled = false;
    setScheduledLoading(false);

    fetch("/api/scheduled?filter=all")
      .then(async (response) => {
        const payload = (await response.json().catch(() => ({}))) as ScheduledListResponse;
        if (!response.ok) throw new Error(payload.error?.message ?? "Could not load scheduled posts");
        if (!cancelled) {
          setLocalScheduled((current) =>
            replaceScheduledGroup(current, payload.data ?? [], [...SCHEDULED_STATUSES]),
          );
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) toast.error(error instanceof Error ? error.message : "Could not load scheduled posts");
      })
      .finally(() => {
        if (!cancelled) setScheduledLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tab]);

  useEffect(() => {
    if (tab !== "history") return;
    let cancelled = false;
    setHistoryLoading(false);

    fetch("/api/history?page=1")
      .then(async (response) => {
        const payload = (await response.json().catch(() => ({}))) as HistoryListResponse;
        if (!response.ok) throw new Error(payload.error?.message ?? "Could not load history");
        if (!cancelled) {
          setLocalScheduled((current) =>
            replaceScheduledGroup(current, payload.data?.items ?? [], [...HISTORY_STATUSES]),
          );
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) toast.error(error instanceof Error ? error.message : "Could not load history");
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tab]);

  function changeTab(nextTab: TaskTab) {
    setTab(nextTab);
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("tab", nextTab);
    router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
  }

  async function cancelScheduled(id: string) {
    setLocalScheduled((current) =>
      current.map((post) => (post.id === id ? { ...post, status: "CANCELLED" } : post)),
    );
    updateBrowserScheduledPost(id, { status: "CANCELLED" });

    if (isBrowserScheduledPostId(id)) {
      toast.success("Post unscheduled");
      return;
    }

    const response = await fetch(`/api/scheduled/${id}`, { method: "DELETE" });
    if (!response.ok) {
      toast.error("Could not unschedule post");
      return;
    }
    toast.success("Post unscheduled");
  }

  async function retryPost(id: string) {
    setLocalScheduled((current) =>
      current.map((post) => (post.id === id ? { ...post, status: "PENDING", failReason: null } : post)),
    );
    updateBrowserScheduledPost(id, { status: "PENDING", failReason: null });
    if (isBrowserScheduledPostId(id)) {
      toast.success("Retry scheduled");
      return;
    }

    const response = await fetch(`/api/scheduled/${id}/retry`, { method: "POST" });
    if (!response.ok) {
      toast.error("Could not retry post");
      return;
    }
    toast.success("Retry scheduled");
  }

  const tabs: Array<{ id: TaskTab; label: string; icon: ReactNode }> = [
    { id: "scheduled", label: "Scheduled", icon: <CalendarDays className="h-4 w-4" /> },
    { id: "history", label: "History", icon: <History className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-display tracking-tight flex items-center gap-2">
          <CheckCircle2 className="h-7 w-7 text-primary" />
          Tasks
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage scheduled post reminders and review notification history.
        </p>
      </div>

      <div className="relative z-10 flex w-full rounded-full border border-[var(--app-line)] bg-[var(--app-surface)] p-1 md:w-auto">
        {tabs.map((item) => (
          <button
            key={item.id}
            onClick={() => changeTab(item.id)}
            className={cn(
              "relative z-10 flex h-10 flex-1 items-center justify-center gap-2 rounded-full px-6 text-sm font-medium transition-colors md:flex-none",
              tab === item.id ? "text-black" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab === item.id && (
              <motion.div
                layoutId="task-tab-indicator"
                className="absolute inset-0 -z-10 rounded-full bg-[var(--violet)]"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>

      <div className="min-h-[400px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {tab === "scheduled" && (
              <ScheduledTab
                contentIndex={contentIndex}
                filter={scheduledFilter}
                loading={scheduledLoading}
                posts={scheduledItems}
                onCancel={cancelScheduled}
                onFilterChange={setScheduledFilter}
              />
            )}
            {tab === "history" && (
              <HistoryTab
                contentIndex={contentIndex}
                loading={historyLoading}
                posts={historyItems}
                onDelete={(id) => setLocalScheduled((current) => current.filter((post) => post.id !== id))}
                onRetry={retryPost}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function ScheduledTab({
  contentIndex,
  filter,
  loading,
  posts,
  onCancel,
  onFilterChange,
}: {
  contentIndex: Map<string, ContentPiece>;
  filter: ScheduledFilter;
  loading: boolean;
  posts: ScheduledPost[];
  onCancel: (id: string) => void;
  onFilterChange: (filter: ScheduledFilter) => void;
}) {
  const grouped = groupByDay(posts);

  return (
    <section className="space-y-6">
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-[var(--app-line)] bg-[var(--app-surface)] p-2 px-4 sm:flex-row sm:items-center">
        <p className="text-sm font-medium text-muted-foreground">Posts scheduled to go out.</p>
        <div className="flex flex-wrap gap-1 rounded-full border border-[var(--app-line)] bg-[var(--app-bg)] p-1">
          {(["upcoming", "today", "week", "all"] as const).map((item) => (
            <button
              className={cn(
                "h-7 rounded-full px-3 text-xs font-medium capitalize transition-colors",
                filter === item ? "bg-[var(--violet)] text-black" : "text-muted-foreground hover:text-foreground",
              )}
              key={item}
              onClick={() => onFilterChange(item)}
              type="button"
            >
              {item === "week" ? "This week" : item}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <LoadingState label="Loading scheduled posts..." />
      ) : posts.length === 0 ? (
        <EmptyState
          headline="Nothing scheduled yet"
          icon={<Clock3 className="h-8 w-8 text-amber-500" />}
          subline="Go to a project and click Schedule on any content card."
        />
      ) : (
        Object.entries(grouped).map(([day, dayPosts], index) => (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="overflow-hidden rounded-2xl border border-[var(--app-line)] bg-[var(--app-surface)]"
            key={day}
          >
            <div className="border-b border-[var(--app-line)] bg-[var(--app-bg)]/45 px-5 py-3">
              <p className="text-sm font-bold text-foreground">{day}</p>
            </div>
            <div className="divide-y divide-[var(--app-line)]">
              {dayPosts.map((post) => {
                const content = post.contentId ? contentIndex.get(post.contentId) : undefined;
                const body = getScheduledBody(post, content);
                return (
                  <div className="grid gap-4 px-5 py-4 transition-colors hover:bg-[var(--app-panel)]/55 md:grid-cols-[240px_140px_minmax(0,1fr)_auto] md:items-center" key={post.id}>
                    <div className="flex min-w-max items-center gap-2 whitespace-nowrap">
                      <span className="inline-flex items-center gap-2 rounded-full border border-[var(--app-line)] bg-[var(--app-bg)]/70 px-2.5 py-1 font-mono text-xs font-semibold">
                        <Clock3 className="h-3 w-3 text-muted-foreground" />
                        {format(new Date(post.publishAt), "h:mma")}
                      </span>
                      <CountdownTimer date={post.publishAt} />
                    </div>
                    <span className="flex items-center gap-2 text-sm font-bold">
                      <PlatformIcon platform={post.platform} />
                      {platformLabel(post.platform)}
                    </span>
                    <p className="truncate text-sm text-muted-foreground font-medium">
                      {truncate(body, 100)}
                    </p>
                    <ScheduledPostActions
                      body={body}
                      content={content}
                      post={post}
                      onCancel={onCancel}
                    />
                  </div>
                );
              })}
            </div>
          </motion.div>
        ))
      )}
    </section>
  );
}

function HistoryTab({
  contentIndex,
  loading,
  posts,
  onDelete,
  onRetry,
}: {
  contentIndex: Map<string, ContentPiece>;
  loading: boolean;
  posts: ScheduledPost[];
  onDelete: (id: string) => void;
  onRetry: (id: string) => void;
}) {
  if (loading) {
    return <LoadingState label="Loading notification history..." />;
  }

  if (posts.length === 0) {
    return (
      <EmptyState
        headline="No notification history yet"
        icon={<History className="h-8 w-8 text-muted-foreground" />}
        subline="When a scheduled reminder email is sent, it will appear here as Email sent. Failed and cancelled reminders appear here too."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--app-line)] bg-[var(--app-surface)]">
      <div className="grid grid-cols-[160px_140px_1fr_120px_130px] gap-4 border-b border-[var(--app-line)] bg-[var(--app-bg)]/45 px-5 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        <span>Date & time</span>
        <span>Platform</span>
        <span>Content preview</span>
        <span>Status</span>
        <span>Actions</span>
      </div>
      <div className="divide-y divide-[var(--app-line)]">
        {posts.map((post) => {
          const content = post.contentId ? contentIndex.get(post.contentId) : undefined;
          const body = getScheduledBody(post, content);
          return (
            <div className="grid grid-cols-[160px_140px_1fr_120px_130px] items-center gap-4 px-5 py-4 text-sm transition-colors hover:bg-[var(--app-panel)]/55" key={post.id}>
              <span className="w-max rounded-md border border-[var(--app-line)] bg-[var(--app-bg)]/70 px-2 py-1 font-mono text-xs font-medium text-muted-foreground">
                {format(new Date(post.publishAt), "MMM d, h:mma")}
              </span>
              <span className="flex items-center gap-2 font-bold text-xs">
                <PlatformIcon platform={post.platform} />
                {platformLabel(post.platform)}
              </span>
              <span className="truncate text-muted-foreground font-medium">{truncate(body, 88)}</span>
              <StatusBadge status={post.status} />
              <span className="flex items-center gap-2">
                {post.status === "FAILED" ? (
                  <Button size="sm" variant="ghost" className="h-8 text-primary hover:text-primary hover:bg-primary/10" onClick={() => onRetry(post.id)}>
                    Retry
                  </Button>
                ) : (
                  <ScheduledPostDialog
                    body={body}
                    content={content}
                    post={post}
                    trigger={
                      <Button size="sm" variant="ghost" className="h-8 text-muted-foreground">
                        View
                      </Button>
                    }
                  />
                )}
                <Button size="sm" variant="ghost" className="h-8 text-muted-foreground hover:text-destructive px-2" onClick={() => onDelete(post.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between border-t border-[var(--app-line)] bg-[var(--app-bg)]/35 px-5 py-4 text-sm text-muted-foreground">
        <span className="font-medium">Showing {posts.length} rows</span>
        <div className="flex gap-2">
          <Button disabled size="sm" variant="secondary" className="rounded-xl h-8">Previous</Button>
          <Button disabled size="sm" variant="secondary" className="rounded-xl h-8">Next</Button>
        </div>
      </div>
    </div>
  );
}

function ScheduledPostActions({
  body,
  content,
  onCancel,
  post,
}: {
  body: string;
  content?: ContentPiece;
  onCancel: (id: string) => void;
  post: ScheduledPost;
}) {
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <Button
        size="sm"
        variant="ghost"
        className="h-9 rounded-lg text-muted-foreground"
        onClick={() => copyScheduledContent(body)}
      >
        <Copy className="mr-1.5 h-3.5 w-3.5" />
        Copy
      </Button>
      <ScheduledPostDialog
        body={body}
        content={content}
        post={post}
        trigger={
          <Button size="sm" variant="secondary" className="h-9 rounded-lg">
            <Eye className="mr-1.5 h-3.5 w-3.5" />
            View full
          </Button>
        }
      />
      <Button
        onClick={() => onCancel(post.id)}
        size="sm"
        variant="ghost"
        className="h-9 rounded-lg text-muted-foreground hover:text-destructive"
      >
        Cancel
      </Button>
    </div>
  );
}

function ScheduledPostDialog({
  body,
  content,
  post,
  trigger,
}: {
  body: string;
  content?: ContentPiece;
  post: ScheduledPost;
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="z-[70] max-h-[86vh] max-w-2xl overflow-y-auto rounded-3xl border-[var(--app-line)] bg-[var(--app-surface)] shadow-soft">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className={cn("h-2.5 w-2.5 rounded-full", platformClass(post.platform))} />
            {platformLabel(post.platform)} scheduled post
          </DialogTitle>
          <DialogDescription>
            {format(new Date(post.publishAt), "EEE, MMM d, yyyy 'at' h:mm a")} · {content?.contentType ?? "Post"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-2xl border border-[var(--app-line)] bg-[var(--app-bg)]/70 p-4">
            <p className="whitespace-pre-wrap text-sm leading-7 text-foreground">{body}</p>
          </div>
          <div className="grid gap-3 text-xs text-muted-foreground sm:grid-cols-3">
            <InfoPill label="Status" value={statusLabel(post.status)} />
            <InfoPill label="Reminder" value={<CountdownTimer date={post.publishAt} />} />
            <InfoPill label="Email" value={post.failReason ? "Failed" : post.publishedAt ? "Sent" : "Pending"} />
          </div>
          {post.failReason ? (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
              {post.failReason}
            </div>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              className="h-10 rounded-xl"
              onClick={() => copyScheduledContent(body)}
              variant="secondary"
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy content
            </Button>
            <Button className="h-10 rounded-xl" onClick={() => setOpen(false)}>
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InfoPill({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[var(--app-line)] bg-[var(--app-bg)]/60 p-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}

function CountdownTimer({ date }: { date: string }) {
  const [now, setNow] = useState(() => Date.now());
  const target = new Date(date).getTime();
  const isExpired = target <= now;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <span className={cn("inline-flex min-w-max whitespace-nowrap text-[11px] font-semibold", isExpired ? "text-amber-400" : "text-cyan-300")}>
      {isExpired ? "Due now" : formatCountdown(target - now)}
    </span>
  );
}

function formatCountdown(diffMs: number) {
  const minutes = Math.max(1, Math.ceil(diffMs / 60_000));
  if (minutes < 60) {
    return `${minutes} ${minutes === 1 ? "minute" : "minutes"} left`;
  }

  const hours = Math.ceil(minutes / 60);
  if (hours < 24) {
    return `${hours} ${hours === 1 ? "hour" : "hours"} left`;
  }

  const days = Math.ceil(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"} left`;
}

async function copyScheduledContent(body: string) {
  try {
    await navigator.clipboard.writeText(body);
    toast.success("Copied to clipboard");
  } catch {
    toast.error("Could not copy content");
  }
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-[var(--app-line)] bg-[var(--app-surface)] p-8">
      <div className="space-y-3 animate-pulse">
        <div className="h-4 w-40 rounded bg-muted" />
        <div className="h-16 rounded-xl bg-muted/60" />
        <div className="h-16 rounded-xl bg-muted/40" />
      </div>
      <p className="sr-only">{label}</p>
    </div>
  );
}

function EmptyState({
  actionHref,
  actionLabel,
  headline,
  icon,
  subline,
}: {
  actionHref?: string;
  actionLabel?: string;
  headline: string;
  icon: ReactNode;
  subline: string;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-[var(--app-line-strong)] bg-[var(--app-surface)] p-12 text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--app-panel)] text-primary">{icon}</div>
      <h2 className="text-2xl font-bold font-display">{headline}</h2>
      <p className="mx-auto mt-3 max-w-md text-base leading-relaxed text-muted-foreground">{subline}</p>
      {actionHref && actionLabel ? (
        <Button asChild size="lg" className="mt-8 rounded-full bg-[var(--violet)] px-8 text-black hover:bg-[var(--violet-hover)]">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      ) : null}
    </div>
  );
}

function StatusBadge({ status }: { status: ScheduledPost["status"] }) {
  if (status === "NOTIFIED") return <Badge variant="success" className="bg-green-500/20 text-green-500 border-0">Email sent</Badge>;
  if (status === "PUBLISHED") return <Badge variant="success" className="bg-green-500/20 text-green-500 border-0">Published</Badge>;
  if (status === "FAILED") return <Badge variant="danger" className="bg-red-500/20 text-red-500 border-0">Failed</Badge>;
  if (status === "CANCELLED") return <Badge variant="muted" className="border-0">Cancelled</Badge>;
  return <Badge variant="warning" className="bg-amber-500/20 text-amber-500 border-0">Scheduled</Badge>;
}

function statusLabel(status: ScheduledPost["status"]) {
  if (status === "NOTIFIED") return "Email sent";
  if (status === "PUBLISHED") return "Published";
  if (status === "FAILED") return "Failed";
  if (status === "CANCELLED") return "Cancelled";
  return "Scheduled";
}

function getScheduledBody(post: ScheduledPost, content?: ContentPiece) {
  return content?.body ?? post.title;
}

function platformClass(platform: Platform) {
  if (platform === "TWITTER") return "bg-[var(--platform-twitter)]";
  if (platform === "LINKEDIN") return "bg-[var(--platform-linkedin)]";
  if (platform === "INSTAGRAM" || platform === "CAROUSEL" || platform === "STORY") return "bg-[var(--platform-instagram)]";
  if (platform === "FACEBOOK") return "bg-blue-500";
  if (platform === "THREADS") return "bg-zinc-200 text-zinc-950";
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

function buildContentIndex(projects: Project[]) {
  const map = new Map<string, ContentPiece>();
  for (const project of projects) {
    for (const content of project.contents ?? []) map.set(content.id, content);
  }
  return map;
}

function matchesScheduledFilter(post: ScheduledPost, filter: ScheduledFilter) {
  const date = new Date(post.publishAt);
  if (filter === "all") return true;
  if (filter === "today") return isToday(date);
  if (filter === "week") return isThisWeek(date, { weekStartsOn: 1 });
  return date.getTime() >= Date.now();
}

function groupByDay(posts: ScheduledPost[]) {
  return posts.reduce<Record<string, ScheduledPost[]>>((acc, post) => {
    const date = new Date(post.publishAt);
    const label = isSameDay(date, new Date())
      ? `Today - ${format(date, "EEEE, d MMM")}`
      : format(date, "EEEE, d MMM");
    acc[label] = [...(acc[label] ?? []), post];
    return acc;
  }, {});
}

function truncate(value: string, length: number) {
  if (value.length <= length) return value;
  return `${value.slice(0, length - 1).trim()}...`;
}

function parseTaskTab(value: string | null): TaskTab {
  if (value === "scheduled" || value === "history") return value;
  return "scheduled";
}

function mergeScheduledPosts(current: ScheduledPost[], incoming: ScheduledPost[]) {
  const normalizedCurrent = current.map(normalizeScheduledPost);
  const normalizedIncoming = incoming.map(normalizeScheduledPost);
  const incomingContentIds = new Set(normalizedIncoming.map((post) => post.contentId).filter(Boolean));
  const optimistic = normalizedCurrent.filter(
    (post) => isEphemeralScheduleId(post.id) && post.contentId && !incomingContentIds.has(post.contentId),
  );

  if (optimistic.length === 0) return normalizedIncoming;

  const incomingIds = new Set(normalizedIncoming.map((post) => post.id));
  return [
    ...normalizedIncoming,
    ...optimistic.filter((post) => !incomingIds.has(post.id)),
  ].sort((a, b) => new Date(a.publishAt).getTime() - new Date(b.publishAt).getTime());
}

function replaceScheduledGroup(
  current: ScheduledPost[],
  incoming: ScheduledPost[],
  statuses: Array<ScheduledPost["status"]>,
) {
  const statusSet = new Set(statuses.map(normalizePostStatus));
  const normalizedCurrent = current.map(normalizeScheduledPost);
  const normalizedIncoming = incoming.map(normalizeScheduledPost);
  return [
    ...normalizedCurrent.filter((post) => !statusSet.has(post.status)),
    ...normalizedIncoming,
  ].sort((a, b) => new Date(a.publishAt).getTime() - new Date(b.publishAt).getTime());
}

function isEphemeralScheduleId(id: string) {
  return id.startsWith("local-scheduled-") || id.startsWith("scheduled-demo-") || isBrowserScheduledPostId(id);
}

function normalizeScheduledPost(post: ScheduledPost): ScheduledPost {
  return {
    ...post,
    publishAt: post.publishAt ?? post.scheduledAt ?? new Date().toISOString(),
    status: normalizePostStatus(post.status),
  };
}

function normalizePostStatus(status: ScheduledPost["status"] | string): ScheduledPost["status"] {
  const normalized = status.toUpperCase();
  if (
    normalized === "DRAFT" ||
    normalized === "PENDING" ||
    normalized === "SCHEDULED" ||
    normalized === "NOTIFIED" ||
    normalized === "PUBLISHED" ||
    normalized === "FAILED" ||
    normalized === "CANCELLED" ||
    normalized === "COMPLETE"
  ) {
    return normalized;
  }
  if (normalized === "PROCESSING") return "PENDING";
  return "PENDING";
}
