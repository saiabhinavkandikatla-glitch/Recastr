"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { EventCard } from "./EventCard";

export function MonthView() {
  return (
    <div className="flex flex-col h-[700px] rounded-[32px] border border-[#232323] bg-[#090909] overflow-hidden">
      <div className="flex items-center justify-between border-b border-[#232323] p-6 bg-[#111111]">
        <h2 className="text-xl font-bold text-white">September 2026</h2>
        <div className="flex items-center gap-2">
          <button className="flex h-8 w-8 items-center justify-center rounded-full bg-[#151515] text-[#8A8A8A] hover:text-white border border-[#232323]">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button className="flex h-8 px-3 text-sm font-medium items-center justify-center rounded-full bg-[#151515] text-white hover:bg-[#232323] border border-[#232323]">
            Today
          </button>
          <button className="flex h-8 w-8 items-center justify-center rounded-full bg-[#151515] text-[#8A8A8A] hover:text-white border border-[#232323]">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 border-b border-[#232323] bg-[#151515] text-center text-xs font-medium text-[#8A8A8A]">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="py-3 uppercase tracking-wider">{day}</div>
        ))}
      </div>
      <div className="flex-1 grid grid-cols-7 grid-rows-5 bg-[#232323] gap-px">
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="bg-[#090909] p-2 hover:bg-[#111111] transition-colors relative min-h-[100px]">
            <span className={`text-sm font-medium ${i === 15 ? "flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white" : "text-[#8A8A8A]"}`}>
              {i > 3 ? i - 3 : 28 + i}
            </span>
            {i === 15 && <EventCard title="Launch Announcement" platform="Twitter" time="10:00 AM" />}
            {i === 18 && <EventCard title="Weekly Update" platform="LinkedIn" time="2:00 PM" />}
          </div>
        ))}
      </div>
    </div>
  );
}
