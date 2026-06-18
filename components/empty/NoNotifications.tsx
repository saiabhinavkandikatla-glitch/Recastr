"use client";

import { BellOff } from "lucide-react";

export function NoNotifications() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-[#232323] bg-[#111111] mb-4">
        <BellOff className="h-6 w-6 text-[#8A8A8A]" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-1">All caught up</h3>
      <p className="text-sm text-[#8A8A8A]">
        You have no new notifications.
      </p>
    </div>
  );
}
