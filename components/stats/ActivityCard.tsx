"use client";

import { CheckCircle2 } from "lucide-react";

export function ActivityCard() {
  return (
    <div className="rounded-[32px] border border-[#232323] bg-[#151515] p-8">
      <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
      <div className="mt-8 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4 rounded-2xl bg-[#111111] p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#090909] border border-[#232323]">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Project generated</p>
              <p className="text-xs text-[#8A8A8A]">2 hours ago</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
