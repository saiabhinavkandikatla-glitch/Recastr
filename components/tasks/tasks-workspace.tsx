"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import { format, isSameDay, isThisWeek, isToday } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarClock, CheckCircle2, Clock3, Copy, Trash2, LayoutList, CalendarDays, History } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ContentPiece, Platform, Project, ScheduledPost } from "@/lib/types";

type TaskTab = "queue" | "scheduled" | "history";
type ScheduledFilter = "upcoming" | "today" | "week" | "all";

export function TasksWorkspace({
  projects,
  scheduledPosts,
}: {
  projects: Project[];
  scheduledPosts: ScheduledPost[];
}) {
  const [tab, setTab] = useState<TaskTab>("queue");
  const [scheduledFilter, setScheduledFilter] = useState<ScheduledFilter>("upcoming");
  const [localScheduled, setLocalScheduled] = useState(scheduledPosts);
  const contentIndex = useMemo(() => buildContentIndex(projects), [projects]);
  const scheduledContentIds = useMemo(
    () => new Set(localScheduled.map((post) => post.contentId).filter(Boolean)),
    [localScheduled],
  );
  const queueItems = useMemo(
    () =>
      projects.flatMap((project) =>
        (project.contents ?? [])
          .filter((content) => content.approved && !scheduledContentIds.has(content.id))
          .map((content) => ({ content, project })),
      ),
    [projects, scheduledContentIds],
  );
  const scheduledItems = useMemo(
    () =>
      localScheduled
        .filter((post) => ["SCHEDULED", "PENDING"].includes(post.status))
        .filter((post) => matchesScheduledFilter(post, scheduledFilter))
        .sort((a, b) => new Date(a.publishAt).getTime() - new Date(b.publishAt).getTime()),
    [localScheduled, scheduledFilter],
  );
  const historyItems = useMemo(
    () =>
      localScheduled
        .filter((post) => ["PUBLISHED", "FAILED", "CANCELLED"].includes(post.status))
        .sort((a, b) => new Date(b.publishAt).getTime() - new Date(a.publishAt).getTime()),
    [localScheduled],
  );

  function scheduleQueued(content: ContentPiece, project: Project, date: Date) {
    const post: ScheduledPost = {
      id: `local-scheduled-${Date.now()}`,
      outputId: content.id,
      contentId: content.id,
      platform: content.platform,
      publishAt: date.toISOString(),
      scheduledAt: date.toISOString(),
      status: "SCHEDULED",
      title: project.title,
    };
    setLocalScheduled((current) => [...current, post]);
    toast.success("Post scheduled");
  }

  function cancelScheduled(id: string) {
    setLocalScheduled((current) =>
      current.map((post) => (post.id === id ? { ...post, status: "CANCELLED" } : post)),
    );
    toast.success("Post unscheduled");
  }

  function retryPost(id: string) {
    setLocalScheduled((current) =>
      current.map((post) => (post.id === id ? { ...post, status: "SCHEDULED", failReason: null } : post)),
    );
    toast.success("Retry queued");
  }

  const tabs: Array<{ id: TaskTab; label: string; icon: ReactNode }> = [
    { id: "queue", label: "Content Queue", icon: <LayoutList className="h-4 w-4" /> },
    { id: "scheduled", label: "Scheduled", icon: <CalendarDays className="h-4 w-4" /> },
    { id: "history", label: "History", icon: <History className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-display tracking-tight flex items-center gap-2">
          <CheckCircle2 className="h-7 w-7 text-primary" />
          Tasks & Queue
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage your publishing pipeline, schedule approved content, and review post history.
        </p>
      </div>

      <div className="flex w-full md:w-auto p-1 bg-card/40 backdrop-blur-md rounded-[16px] border border-white/5 relative z-10 glass-panel">
        {tabs.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={cn(
              "relative flex-1 md:flex-none flex items-center justify-center gap-2 h-10 px-6 rounded-[12px] text-sm font-medium transition-colors z-10",
              tab === item.id ? "text-white" : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
            )}
          >
            {tab === item.id && (
              <motion.div
                layoutId="task-tab-indicator"
                className="absolute inset-0 rounded-[12px] bg-gradient-to-r from-violet-600 to-cyan-500 shadow-sm -z-10"
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
            {tab === "queue" && (
              <QueueTab items={queueItems} onSchedule={scheduleQueued} />
            )}
            {tab === "scheduled" && (
              <ScheduledTab
                contentIndex={contentIndex}
                filter={scheduledFilter}
                posts={scheduledItems}
                onCancel={cancelScheduled}
                onFilterChange={setScheduledFilter}
              />
            )}
            {tab === "history" && (
              <HistoryTab
                contentIndex={contentIndex}
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

function QueueTab({
  items,
  onSchedule,
}: {
  items: Array<{ content: ContentPiece; project: Project }>;
  onSchedule: (content: ContentPiece, project: Project, date: Date) => void;
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        actionHref="/dashboard"
        actionLabel="Go to Dashboard"
        headline="Queue is empty"
        icon={<CheckCircle2 className="h-8 w-8 text-primary" />}
        subline="Approve content inside any project to move it into your scheduling queue."
      />
    );
  }

  return (
    <section className="space-y-4">
      <p className="text-sm text-muted-foreground font-medium">Approved content waiting to be scheduled.</p>
      <div className="grid gap-4 md:grid-cols-2">
        {items.map(({ content, project }, index) => (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            key={content.id}
          >
            <QueueCard
              content={content}
              onSchedule={(date) => onSchedule(content, project, date)}
              project={project}
            />
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function QueueCard({
  content,
  project,
  onSchedule,
}: {
  content: ContentPiece;
  project: Project;
  onSchedule: (date: Date) => void;
}) {
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [dateValue, setDateValue] = useState(defaultScheduleValue());

  return (
    <article className="h-full flex flex-col rounded-[20px] border border-white/5 bg-card/40 backdrop-blur-md p-5 glass-card shadow-lg hover:shadow-xl hover:border-primary/20 transition-all">
      <div className="flex flex-wrap items-center gap-3 border-b border-border/50 pb-4">
        <div className={cn("flex h-8 w-8 items-center justify-center rounded-[8px] text-white shadow-sm", platformClass(content.platform))}>
          <span className="text-[14px] font-bold">{platformLabel(content.platform).charAt(0)}</span>
        </div>
        <div>
          <span className="text-sm font-bold text-foreground block">{platformLabel(content.platform)}</span>
          <span className="text-xs font-medium text-muted-foreground">{project.title}</span>
        </div>
        <Badge variant="muted" className="ml-auto bg-primary/10 text-primary border-0">{content.contentType}</Badge>
      </div>

      <p className="mt-4 flex-1 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{truncate(content.body, 180)}</p>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Button onClick={() => setScheduleOpen((current) => !current)} size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl shadow-glow">
          <CalendarClock className="mr-2 h-4 w-4" />
          Schedule
        </Button>
        <Button
          onClick={() => {
            void navigator.clipboard.writeText(content.body);
            toast.success("Copied to clipboard");
          }}
          size="icon"
          variant="secondary"
          className="rounded-xl bg-muted/50 hover:bg-muted"
        >
          <Copy className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" className="rounded-xl ml-auto text-muted-foreground hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <AnimatePresence>
        {scheduleOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 overflow-hidden"
          >
            <div className="flex flex-col gap-2 rounded-[14px] border border-white/5 bg-background/50 p-3 sm:flex-row sm:items-center">
              <input
                aria-label="Schedule date and time"
                className="flex-1 h-9 rounded-lg border-0 bg-muted/30 px-3 text-sm outline-none focus:ring-2 focus:ring-primary/50"
                type="datetime-local"
                value={dateValue}
                onChange={(event) => setDateValue(event.target.value)}
              />
              <Button
                onClick={() => {
                  onSchedule(new Date(dateValue));
                  setScheduleOpen(false);
                }}
                size="sm"
                className="rounded-lg"
              >
                Confirm
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
}

function ScheduledTab({
  contentIndex,
  filter,
  posts,
  onCancel,
  onFilterChange,
}: {
  contentIndex: Map<string, ContentPiece>;
  filter: ScheduledFilter;
  posts: ScheduledPost[];
  onCancel: (id: string) => void;
  onFilterChange: (filter: ScheduledFilter) => void;
}) {
  const grouped = groupByDay(posts);

  return (
    <section className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-2 px-4 rounded-[16px] border border-white/5">
        <p className="text-sm font-medium text-muted-foreground">Posts scheduled to go out.</p>
        <div className="flex flex-wrap gap-1 bg-card/50 p-1 rounded-xl border border-white/5">
          {(["upcoming", "today", "week", "all"] as const).map((item) => (
            <button
              className={cn(
                "h-7 rounded-[8px] px-3 text-xs font-medium capitalize transition-colors",
                filter === item ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
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

      {posts.length === 0 ? (
        <EmptyState
          headline="Nothing scheduled yet"
          icon={<Clock3 className="h-8 w-8 text-amber-500" />}
          subline="Head to Queue and schedule approved content."
        />
      ) : (
        Object.entries(grouped).map(([day, dayPosts], index) => (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="rounded-[20px] border border-white/5 glass-card bg-card/40 overflow-hidden shadow-lg"
            key={day}
          >
            <div className="border-b border-white/5 bg-muted/20 px-5 py-3">
              <p className="text-sm font-bold text-foreground">{day}</p>
            </div>
            <div className="divide-y divide-white/5">
              {dayPosts.map((post) => {
                const content = post.contentId ? contentIndex.get(post.contentId) : undefined;
                return (
                  <div className="grid gap-4 px-5 py-4 md:grid-cols-[100px_140px_1fr_auto] md:items-center hover:bg-muted/10 transition-colors" key={post.id}>
                    <span className="inline-flex items-center gap-2 rounded-full bg-background/50 px-2.5 py-1 font-mono text-xs font-semibold border border-white/5">
                      <Clock3 className="h-3 w-3 text-muted-foreground" />
                      {format(new Date(post.publishAt), "h:mma")}
                    </span>
                    <span className="flex items-center gap-2 text-sm font-bold">
                      <div className={cn("flex h-6 w-6 items-center justify-center rounded-[6px] text-white", platformClass(post.platform))}>
                        <span className="text-[10px] font-bold">{platformLabel(post.platform).charAt(0)}</span>
                      </div>
                      {platformLabel(post.platform)}
                    </span>
                    <p className="truncate text-sm text-muted-foreground font-medium">
                      {content ? truncate(content.body, 100) : post.title}
                    </p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" className="rounded-lg h-8">Edit</Button>
                      <Button onClick={() => onCancel(post.id)} size="sm" variant="ghost" className="rounded-lg h-8 text-muted-foreground hover:text-destructive">Cancel</Button>
                    </div>
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
  posts,
  onDelete,
  onRetry,
}: {
  contentIndex: Map<string, ContentPiece>;
  posts: ScheduledPost[];
  onDelete: (id: string) => void;
  onRetry: (id: string) => void;
}) {
  if (posts.length === 0) {
    return (
      <EmptyState
        headline="No publishing history yet"
        icon={<History className="h-8 w-8 text-muted-foreground" />}
        subline="Published, failed, and cancelled posts will appear here."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-[20px] border border-white/5 glass-card bg-card/40 shadow-lg">
      <div className="grid grid-cols-[160px_140px_1fr_120px_130px] gap-4 border-b border-white/5 bg-muted/20 px-5 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        <span>Date & time</span>
        <span>Platform</span>
        <span>Content preview</span>
        <span>Status</span>
        <span>Actions</span>
      </div>
      <div className="divide-y divide-white/5">
        {posts.map((post) => {
          const content = post.contentId ? contentIndex.get(post.contentId) : undefined;
          return (
            <div className="grid grid-cols-[160px_140px_1fr_120px_130px] gap-4 px-5 py-4 text-sm hover:bg-muted/10 transition-colors items-center" key={post.id}>
              <span className="font-mono text-xs font-medium text-muted-foreground bg-background/50 px-2 py-1 rounded-md border border-white/5 w-max">
                {format(new Date(post.publishAt), "MMM d, h:mma")}
              </span>
              <span className="flex items-center gap-2 font-bold text-xs">
                <div className={cn("flex h-6 w-6 items-center justify-center rounded-[6px] text-white", platformClass(post.platform))}>
                  <span className="text-[10px] font-bold">{platformLabel(post.platform).charAt(0)}</span>
                </div>
                {platformLabel(post.platform)}
              </span>
              <span className="truncate text-muted-foreground font-medium">{content ? truncate(content.body, 88) : post.title}</span>
              <StatusBadge status={post.status} />
              <span className="flex items-center gap-2">
                {post.status === "FAILED" ? (
                  <Button size="sm" variant="ghost" className="h-8 text-primary hover:text-primary hover:bg-primary/10" onClick={() => onRetry(post.id)}>
                    Retry
                  </Button>
                ) : (
                  <Button size="sm" variant="ghost" className="h-8 text-muted-foreground">View</Button>
                )}
                <Button size="sm" variant="ghost" className="h-8 text-muted-foreground hover:text-destructive px-2" onClick={() => onDelete(post.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between border-t border-white/5 px-5 py-4 text-sm text-muted-foreground bg-card/20">
        <span className="font-medium">Showing {posts.length} rows</span>
        <div className="flex gap-2">
          <Button disabled size="sm" variant="secondary" className="rounded-xl h-8">Previous</Button>
          <Button disabled size="sm" variant="secondary" className="rounded-xl h-8">Next</Button>
        </div>
      </div>
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
    <div className="rounded-[24px] border border-dashed border-white/10 bg-card/20 p-12 text-center glass-panel">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/5 text-primary shadow-glow mb-6">{icon}</div>
      <h2 className="text-2xl font-bold font-display">{headline}</h2>
      <p className="mx-auto mt-3 max-w-md text-base leading-relaxed text-muted-foreground">{subline}</p>
      {actionHref && actionLabel ? (
        <Button asChild size="lg" className="mt-8 rounded-full bg-gradient-to-r from-violet-600 to-cyan-500 text-white hover:opacity-90 px-8 shadow-glow transition-transform hover:scale-105">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      ) : null}
    </div>
  );
}

function StatusBadge({ status }: { status: ScheduledPost["status"] }) {
  if (status === "PUBLISHED") return <Badge variant="success" className="bg-green-500/20 text-green-500 border-0">Published</Badge>;
  if (status === "FAILED") return <Badge variant="danger" className="bg-red-500/20 text-red-500 border-0">Failed</Badge>;
  if (status === "CANCELLED") return <Badge variant="muted" className="border-0">Cancelled</Badge>;
  return <Badge variant="warning" className="bg-amber-500/20 text-amber-500 border-0">Scheduled</Badge>;
}

function platformClass(platform: Platform) {
  if (platform === "TWITTER") return "bg-[var(--platform-twitter)]";
  if (platform === "LINKEDIN") return "bg-[var(--platform-linkedin)]";
  if (platform === "INSTAGRAM" || platform === "CAROUSEL" || platform === "STORY") return "bg-[var(--platform-instagram)]";
  return "bg-[var(--platform-youtube)]";
}

function platformLabel(platform: Platform) {
  if (platform === "TWITTER") return "Twitter / X";
  if (platform === "LINKEDIN") return "LinkedIn";
  if (platform === "INSTAGRAM" || platform === "CAROUSEL" || platform === "STORY") return "Instagram";
  return "YouTube";
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

function defaultScheduleValue() {
  const next = new Date(Date.now() + 24 * 60 * 60 * 1000);
  next.setMinutes(0, 0, 0);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}T${String(next.getHours()).padStart(2, "0")}:00`;
}
