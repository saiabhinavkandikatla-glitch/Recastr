"use client";

interface NotificationCardProps {
  title: string;
  time: string;
  isUnread?: boolean;
}

export function NotificationCard({ title, time, isUnread }: NotificationCardProps) {
  return (
    <div className={`relative flex flex-col gap-1 rounded-xl p-4 transition-colors hover:bg-[#151515] ${isUnread ? "bg-[#111111]" : ""}`}>
      {isUnread && <span className="absolute left-2 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-blue-500"></span>}
      <h4 className={`text-sm ${isUnread ? "font-semibold text-white ml-2" : "font-medium text-[#D1D1D1]"}`}>
        {title}
      </h4>
      <p className={`text-xs text-[#8A8A8A] ${isUnread ? "ml-2" : ""}`}>{time}</p>
    </div>
  );
}
