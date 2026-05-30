"use client";

import { useMemo, useState } from "react";
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { addDays, format, startOfWeek } from "date-fns";
import { CalendarClock, Shuffle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatPlatform } from "@/lib/utils";
import type { Platform, ScheduledPost } from "@/lib/types";

const platformAccent: Record<Platform, string> = {
  TWITTER: "border-sky-500 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  LINKEDIN: "border-blue-700 bg-blue-700/10 text-blue-700 dark:text-blue-300",
  INSTAGRAM: "border-pink-500 bg-pink-500/10 text-pink-700 dark:text-pink-300",
  FACEBOOK: "border-blue-600 bg-blue-600/10 text-blue-700 dark:text-blue-300",
  THREADS: "border-zinc-800 bg-zinc-800/10 text-zinc-800 dark:text-zinc-100",
  YOUTUBE: "border-red-600 bg-red-600/10 text-red-700 dark:text-red-300",
  CAROUSEL: "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  COMMUNITY: "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  STORY: "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
};

const slots = ["09:00", "12:00", "15:00", "18:00"];

export function Scheduler({ scheduledPosts }: { scheduledPosts: ScheduledPost[] }) {
  const [view, setView] = useState<"week" | "month">("week");
  const [posts, setPosts] = useState(scheduledPosts);
  const weekDays = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    return Array.from({ length: view === "week" ? 7 : 14 }, (_, index) => addDays(start, index));
  }, [view]);

  function onDragEnd(event: DragEndEvent) {
    const postId = String(event.active.id);
    const slotId = event.over?.id ? String(event.over.id) : "";
    if (!slotId) return;
    const [dateValue, timeValue] = slotId.split("|");
    const nextPublishAt = new Date(`${dateValue}T${timeValue}:00`).toISOString();
    setPosts((current) =>
      current.map((post) =>
        post.id === postId
          ? { ...post, publishAt: nextPublishAt, status: "SCHEDULED" }
          : post,
      ),
    );
    toast.success("Post snapped to calendar slot", {
      description: `${format(new Date(nextPublishAt), "EEE, MMM d")} at ${timeValue}`,
    });
  }

  function bulkSchedule() {
    const start = new Date();
    setPosts((current) =>
      current.map((post, index) => ({
        ...post,
        publishAt: addDays(start, Math.floor((index * 7) / Math.max(current.length, 1))).toISOString(),
        status: "SCHEDULED",
      })),
    );
    toast.success("Distributed posts over the next 7 days");
  }

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-primary" />
              Content calendar
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Drag drafts onto a snap-to-time email reminder slot.
            </p>
          </div>
          <div className="flex gap-2">
            <div className="flex rounded-[8px] border bg-muted p-1">
              {(["week", "month"] as const).map((option) => (
                <button
                  key={option}
                  onClick={() => setView(option)}
                  className={cn(
                    "h-8 rounded-[6px] px-3 text-sm capitalize",
                    view === option && "bg-card shadow-sm",
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
            <Button onClick={bulkSchedule}>
              <Shuffle className="h-4 w-4" />
              7-day spread
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <div className="grid gap-4 xl:grid-cols-[260px_1fr]">
            <div className="space-y-3 rounded-[12px] border bg-muted/30 p-3">
              <p className="text-sm font-medium">Draft reminders</p>
              {posts.map((post) => (
                <DraggablePost key={post.id} post={post} />
              ))}
            </div>
            <div className="overflow-x-auto">
              <div
                className="grid min-w-[860px] gap-2"
                style={{ gridTemplateColumns: `repeat(${weekDays.length}, minmax(118px, 1fr))` }}
              >
                {weekDays.map((day) => (
                  <div key={day.toISOString()} className="rounded-[12px] border bg-card p-2">
                    <div className="mb-2">
                      <p className="text-xs font-medium uppercase text-muted-foreground">
                        {format(day, "EEE")}
                      </p>
                      <p className="text-sm font-medium">{format(day, "MMM d")}</p>
                    </div>
                    <div className="space-y-2">
                      {slots.map((slot) => (
                        <CalendarSlot
                          key={`${day.toISOString()}-${slot}`}
                          id={`${format(day, "yyyy-MM-dd")}|${slot}`}
                          label={slot}
                          posts={posts.filter(
                            (post) =>
                              format(new Date(post.publishAt), "yyyy-MM-dd") ===
                                format(day, "yyyy-MM-dd") &&
                              format(new Date(post.publishAt), "HH:mm") === slot,
                          )}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DndContext>
      </CardContent>
    </Card>
  );
}

function DraggablePost({ post }: { post: ScheduledPost }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: post.id,
  });
  const style = {
    transform: CSS.Translate.toString(transform),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "cursor-grab rounded-[8px] border p-3 text-sm shadow-sm active:cursor-grabbing",
        platformAccent[post.platform],
      )}
    >
      <p className="font-medium">{post.title}</p>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs">{formatPlatform(post.platform)}</span>
        <Badge variant={post.status === "SCHEDULED" ? "warning" : "muted"}>
          {post.status.toLowerCase()}
        </Badge>
      </div>
    </div>
  );
}

function CalendarSlot({
  id,
  label,
  posts,
}: {
  id: string;
  label: string;
  posts: ScheduledPost[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-20 rounded-[8px] border border-dashed bg-muted/30 p-2 transition",
        isOver && "border-primary bg-primary/10",
      )}
    >
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <div className="mt-2 space-y-1">
        {posts.map((post) => (
          <div
            key={post.id}
            className={cn("rounded-[6px] border px-2 py-1 text-[11px]", platformAccent[post.platform])}
          >
            {post.title}
          </div>
        ))}
      </div>
    </div>
  );
}
