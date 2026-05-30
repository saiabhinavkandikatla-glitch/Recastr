"use client";

import { useMemo, useState } from "react";
import {
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarDays, CalendarPlus, CheckCircle2, ChevronLeft, ChevronRight, GripVertical, Plus, Shuffle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { readBrowserScheduledPosts } from "@/lib/browser-schedule-store";
import { cn } from "@/lib/utils";
import type { Platform, ScheduledPost } from "@/lib/types";

type ViewMode = "month" | "week" | "day";

export function ScheduleCalendar({ scheduledPosts }: { scheduledPosts: ScheduledPost[] }) {
  const [cursor, setCursor] = useState(new Date());
  const [view, setView] = useState<ViewMode>("month");
  const [posts] = useState(() => mergeScheduledPosts(scheduledPosts, readBrowserScheduledPosts()));
  const visibleDays = useMemo(() => getVisibleDays(cursor, view), [cursor, view]);

  const historyPosts = useMemo(
    () => posts.filter((post) => !["SCHEDULED", "PENDING"].includes(post.status)),
    [posts],
  );

  function move(direction: "prev" | "next") {
    setCursor((current) => {
      if (view === "month") return direction === "next" ? addMonths(current, 1) : subMonths(current, 1);
      if (view === "week") return direction === "next" ? addWeeks(current, 1) : subWeeks(current, 1);
      return new Date(current.getTime() + (direction === "next" ? 1 : -1) * 24 * 60 * 60 * 1000);
    });
  }

  function autoSchedule() {
    toast.info("Auto-schedule is available from project content cards.");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight flex items-center gap-2">
            <CalendarDays className="h-7 w-7 text-primary" />
            Content Calendar
          </h1>
          <p className="mt-2 text-sm text-muted-foreground flex items-center gap-2">
            <span className="font-medium text-foreground">{format(cursor, "MMMM yyyy")}</span>
            <span className="h-1 w-1 rounded-full bg-muted-foreground/50" />
            Email reminders by date
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-[16px] glass-card p-1">
          <Button onClick={() => move("prev")} size="icon" variant="ghost" className="h-9 w-9 rounded-xl hover:bg-muted/50">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button onClick={() => setCursor(new Date())} size="sm" variant="ghost" className="h-9 rounded-xl px-4 font-medium hover:bg-muted/50">
            Today
          </Button>
          <Button onClick={() => move("next")} size="icon" variant="ghost" className="h-9 w-9 rounded-xl hover:bg-muted/50">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 glass-panel rounded-[20px] p-2 pr-4 shadow-sm">
        <div className="flex gap-1 p-1 bg-card/50 rounded-2xl border border-white/5">
          {(["month", "week", "day"] as const).map((option) => (
            <button
              className={cn(
                "relative h-9 rounded-[12px] px-6 text-sm font-medium capitalize transition-colors z-10",
                view === option ? "text-white" : "text-muted-foreground hover:text-foreground hover:bg-muted/30",
              )}
              key={option}
              onClick={() => setView(option)}
              type="button"
            >
              {view === option && (
                <motion.div
                  layoutId="view-mode-indicator"
                  className="absolute inset-0 rounded-[12px] bg-gradient-to-r from-violet-600 to-cyan-500 shadow-sm -z-10"
                  initial={false}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              {option}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={autoSchedule} size="sm" variant="outline" className="h-10 rounded-xl bg-card/50 border-white/10 hover:bg-card">
            <Shuffle className="mr-2 h-4 w-4 text-primary" />
            Preview cadence
          </Button>
          <Button size="sm" className="h-10 rounded-xl bg-primary text-primary-foreground hover:opacity-90 shadow-glow">
            <CalendarPlus className="mr-2 h-4 w-4" />
            New post
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="overflow-hidden rounded-[24px] border border-white/10 glass-card bg-card/40 shadow-xl relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />

          <div className="grid grid-cols-7 border-b border-white/10 bg-muted/20 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground relative z-10">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div className="px-2 py-4" key={day}>{day}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 relative z-10">
            {visibleDays.map((day) => {
              const dayPosts = posts.filter((post) => isSameDay(new Date(post.publishAt), day) && ["SCHEDULED", "PENDING"].includes(post.status));
              const isToday = isSameDay(day, new Date());
              const isCurrentMonth = isSameMonth(day, cursor) || view !== "month";

              return (
                <div
                  className={cn(
                    "group relative min-h-[140px] border-b border-r border-white/5 p-2 transition-colors",
                    !isCurrentMonth && "bg-muted/10 opacity-60",
                    isToday ? "bg-primary/5" : "hover:bg-muted/20",
                  )}
                  key={day.toISOString()}
                >
                  <div className="flex items-start justify-between">
                    <span className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium transition-colors",
                      isToday
                        ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                        : "text-foreground group-hover:text-primary"
                    )}>
                      {format(day, "d")}
                    </span>
                    <button
                      className="opacity-0 transition-opacity group-hover:opacity-100 h-6 w-6 flex items-center justify-center rounded-md hover:bg-muted/50 text-muted-foreground"
                      onClick={() => toast.info(`Add post to ${format(day, "MMM d")}`)}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-2 space-y-1.5 h-[calc(100%-2rem)] overflow-y-auto scrollbar-thin pr-1">
                    <AnimatePresence>
                      {dayPosts.slice(0, 4).map((post) => (
                        <motion.div
                          layoutId={`post-${post.id}`}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="group/post flex items-center gap-1.5 overflow-hidden rounded-[8px] border border-white/10 bg-card/80 p-1.5 pr-2 text-xs shadow-sm hover:border-primary/30 hover:shadow-md cursor-grab active:cursor-grabbing transition-colors"
                          key={post.id}
                        >
                          <div className={cn("h-full w-1 rounded-full shrink-0", platformBorder(post.platform))} />
                          <div className={cn("flex h-5 w-5 items-center justify-center rounded-md text-white shrink-0", platformClass(post.platform))}>
                            <span className="text-[9px] font-bold">{platformLabel(post.platform).charAt(0)}</span>
                          </div>
                          <span className="truncate font-medium flex-1">{post.title}</span>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    {dayPosts.length > 4 && (
                      <p className="text-[10px] font-medium text-muted-foreground text-center py-1">
                        +{dayPosts.length - 4} more posts
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <aside className="flex flex-col max-h-[calc(100vh-14rem)] overflow-hidden rounded-[24px] border border-white/10 glass-card bg-card/40 shadow-xl relative">
          <div className="p-5 border-b border-white/10 bg-muted/10 relative z-10">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold flex items-center gap-2 text-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Reminder History
              </h3>
              <Badge className="bg-primary/10 text-primary border-primary/20">{historyPosts.length}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">Notified, failed, and cancelled reminders</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 relative z-10 scrollbar-thin">
            <AnimatePresence>
              {historyPosts.length ? (
                historyPosts.map((post, i) => (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="group relative flex flex-col gap-2 rounded-[16px] border border-white/10 bg-card p-3 shadow-sm hover:border-primary/30 hover:shadow-md cursor-grab active:cursor-grabbing transition-all"
                    key={post.id}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={cn("flex h-6 w-6 items-center justify-center rounded-lg text-white", platformClass(post.platform))}>
                          <span className="text-[10px] font-bold">{platformLabel(post.platform).charAt(0)}</span>
                        </div>
                        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{platformLabel(post.platform)}</span>
                      </div>
                      <GripVertical className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
                    </div>
                    <p className="line-clamp-2 text-sm font-medium text-foreground">{post.title}</p>
                  </motion.div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-40 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-medium">No reminder history</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">Scheduled reminders will move here after they fire or are cancelled.</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </aside>
      </div>
    </div>
  );
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

function platformClass(platform: Platform) {
  if (platform === "TWITTER") return "bg-[var(--platform-twitter)]";
  if (platform === "LINKEDIN") return "bg-[var(--platform-linkedin)]";
  if (platform === "INSTAGRAM" || platform === "CAROUSEL" || platform === "STORY") return "bg-[var(--platform-instagram)]";
  return "bg-[var(--platform-youtube)]";
}

function platformBorder(platform: Platform) {
  if (platform === "TWITTER") return "bg-[var(--platform-twitter)]";
  if (platform === "LINKEDIN") return "bg-[var(--platform-linkedin)]";
  if (platform === "INSTAGRAM" || platform === "CAROUSEL" || platform === "STORY") return "bg-[var(--platform-instagram)]";
  return "bg-[var(--platform-youtube)]";
}

function platformLabel(platform: Platform) {
  if (platform === "TWITTER") return "Twitter";
  if (platform === "LINKEDIN") return "LinkedIn";
  if (platform === "INSTAGRAM" || platform === "CAROUSEL" || platform === "STORY") return "Instagram";
  return "YouTube";
}

function mergeScheduledPosts(current: ScheduledPost[], incoming: ScheduledPost[]) {
  const map = new Map(current.map((post) => [post.contentId ?? post.id, post]));
  for (const post of incoming) {
    map.set(post.contentId ?? post.id, post);
  }
  return Array.from(map.values()).sort((a, b) => new Date(a.publishAt).getTime() - new Date(b.publishAt).getTime());
}
