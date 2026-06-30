"use client";

import { useEffect, useState, useMemo } from "react";
import { CheckCircle2, Clock, PlayCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import type { Project, ScheduledPost } from "@/lib/types";

export function ActivityFeed({
  projects = [],
  scheduled = [],
}: {
  projects?: Project[];
  scheduled?: ScheduledPost[];
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activities = useMemo(() => {
    const list: Array<{
      id: string;
      content: string;
      target: string;
      time: string;
      icon: any;
      iconColor: string;
      timestamp: number;
    }> = [];

    // Add projects
    projects.forEach((p) => {
      list.push({
        id: `project-${p.id}`,
        content: "Generated content pack for",
        target: p.title,
        time: mounted ? formatDistanceToNow(new Date(p.createdAt)) + " ago" : "recently",
        icon: CheckCircle2,
        iconColor: "text-emerald-500",
        timestamp: new Date(p.createdAt).getTime(),
      });
    });

    // Add scheduled posts
    scheduled.forEach((s) => {
      const p = projects.find((proj) =>
        proj.contents?.some((c) => c.id === s.contentId || c.id === s.outputId)
      );
      const postTime = s.scheduledAt ? new Date(s.scheduledAt) : new Date(s.publishAt);
      list.push({
        id: `scheduled-${s.id}`,
        content: `Scheduled ${s.platform} reminder`,
        target: p?.title ?? "project post",
        time: mounted ? formatDistanceToNow(postTime) + " ago" : "recently",
        icon: Clock,
        iconColor: "text-[var(--violet)]",
        timestamp: postTime.getTime(),
      });
    });

    // Sort by timestamp desc
    return list.sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
  }, [projects, scheduled, mounted]);

  return (
    <Card className="flex flex-col bg-[#090909] border-[#232323]">
      <div className="border-b border-[#232323] p-6">
        <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
      </div>
      <div className="flex-1 p-6">
        {activities.length > 0 ? (
          <div className="relative space-y-6 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-[#232323] before:to-transparent">
            {activities.map((activity) => {
              const Icon = activity.icon;
              return (
                <div key={activity.id} className="relative flex items-center justify-between md:justify-normal group is-active">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border border-[#232323] bg-[#151515] shrink-0 shadow-sm z-10">
                    <Icon className={`h-5 w-5 ${activity.iconColor}`} />
                  </div>
                  <div className="w-[calc(100%-4rem)] ml-4 p-4 rounded-xl border border-[#232323] bg-[#090909] transition-colors hover:bg-[#151515]">
                    <div className="flex flex-col gap-1">
                      <p className="text-sm text-white">
                        <span className="text-[#8A8A8A]">{activity.content}</span>{" "}
                        <span className="font-medium">{activity.target}</span>
                      </p>
                      <time className="text-xs text-[#8A8A8A]">{activity.time}</time>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-6 text-center text-sm text-muted-foreground">
            No recent activity. Ingest a video to start!
          </div>
        )}
      </div>
    </Card>
  );
}
