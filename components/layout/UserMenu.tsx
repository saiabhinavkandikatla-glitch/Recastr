"use client";

import { Bell, User } from "lucide-react";

export function UserMenu() {
  return (
    <div className="flex items-center gap-4">
      <button className="relative flex h-9 w-9 items-center justify-center rounded-full text-[#8A8A8A] transition-colors hover:bg-[#151515] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
        <Bell className="h-5 w-5" />
        <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-blue-500 ring-2 ring-[#090909]"></span>
      </button>
      <button className="flex h-9 w-9 items-center justify-center rounded-full border border-[#232323] bg-[#151515] text-[#8A8A8A] hover:text-white transition-colors">
        <User className="h-5 w-5" />
      </button>
    </div>
  );
}
