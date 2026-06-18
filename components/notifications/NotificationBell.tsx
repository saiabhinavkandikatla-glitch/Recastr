"use client";

import { Bell } from "lucide-react";
import { useState } from "react";
import { NotificationDrawer } from "./NotificationDrawer";

export function NotificationBell() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button 
        onClick={() => setOpen(true)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-[#8A8A8A] transition-colors hover:bg-[#151515] hover:text-white"
      >
        <Bell className="h-5 w-5" />
        <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-blue-500 ring-2 ring-[#090909]"></span>
      </button>

      {open && <NotificationDrawer onClose={() => setOpen(false)} />}
    </>
  );
}
