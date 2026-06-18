"use client";

import { CheckCircle2, Clock, PlayCircle } from "lucide-react";
import { Card } from "@/components/ui/card";

const activities = [
  {
    id: 1,
    content: "Generated content for",
    target: "Product Launch Strategy",
    time: "2 hours ago",
    icon: CheckCircle2,
    iconColor: "text-emerald-500",
  },
  {
    id: 2,
    content: "Started generating",
    target: "Weekly Engineering Update",
    time: "4 hours ago",
    icon: PlayCircle,
    iconColor: "text-blue-500",
  },
  {
    id: 3,
    content: "Scheduled post to Twitter for",
    target: "Q3 Marketing Campaign",
    time: "1 day ago",
    icon: Clock,
    iconColor: "text-[#8A8A8A]",
  },
];

export function ActivityFeed() {
  return (
    <Card className="flex flex-col bg-[#090909] border-[#232323]">
      <div className="border-b border-[#232323] p-6">
        <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
      </div>
      <div className="flex-1 p-6">
        <div className="relative space-y-6 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-[#232323] before:to-transparent">
          {activities.map((activity) => {
            const Icon = activity.icon;
            return (
              <div key={activity.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-[#232323] bg-[#151515] shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10">
                  <Icon className={`h-5 w-5 ${activity.iconColor}`} />
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-[#232323] bg-[#090909] transition-colors hover:bg-[#151515]">
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
      </div>
    </Card>
  );
}
