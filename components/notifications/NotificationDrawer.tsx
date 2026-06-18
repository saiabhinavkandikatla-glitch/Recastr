"use client";

import { X } from "lucide-react";
import { NotificationCard } from "./NotificationCard";

interface NotificationDrawerProps {
  onClose: () => void;
}

export function NotificationDrawer({ onClose }: NotificationDrawerProps) {
  return (
    <>
      <div className="fixed inset-0 z-50 bg-[#090909]/80 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm border-l border-[#232323] bg-[#090909] shadow-2xl animate-in slide-in-from-right sm:max-w-md">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-[#232323] px-6 py-4">
            <h2 className="text-lg font-semibold text-white">Notifications</h2>
            <button onClick={onClose} className="rounded-full p-2 text-[#8A8A8A] hover:bg-[#151515] hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <NotificationCard title="Export Completed" time="2 min ago" isUnread />
            <NotificationCard title="Payment Successful" time="1 hour ago" />
            <NotificationCard title="Welcome to ReCastr!" time="1 day ago" />
          </div>
        </div>
      </div>
    </>
  );
}
