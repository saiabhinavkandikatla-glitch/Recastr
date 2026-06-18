"use client";

import { Twitter, Linkedin } from "lucide-react";

interface EventCardProps {
  title: string;
  platform: string;
  time: string;
}

export function EventCard({ title, platform, time }: EventCardProps) {
  const Icon = platform === "Twitter" ? Twitter : Linkedin;
  const bgColor = platform === "Twitter" ? "bg-[#1DA1F2]/10 border-[#1DA1F2]/30 text-[#1DA1F2]" : "bg-[#0A66C2]/10 border-[#0A66C2]/30 text-[#0A66C2]";

  return (
    <div className={`mt-2 rounded-lg border px-2 py-1.5 shadow-sm transition-all hover:scale-105 cursor-pointer ${bgColor}`}>
      <div className="flex items-center gap-1.5">
        <Icon className="h-3 w-3 shrink-0" />
        <span className="truncate text-xs font-medium">{title}</span>
      </div>
      <div className="mt-1 text-[10px] font-medium opacity-80">{time}</div>
    </div>
  );
}
