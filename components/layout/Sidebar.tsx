"use client";

import Link from "next/link";
import { LayoutDashboard, Sparkles, FolderOpen, Calendar, BarChart3, Settings, Video, Bot } from "lucide-react";
import { useAppStore } from "@/store/app-store";
import { useKeyboardShortcut } from "@/hooks/useKeyboardShortcut";

const items = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Sparkles, label: "Generator", href: "/generate" },
  { icon: FolderOpen, label: "Projects", href: "/projects" },
  { icon: Calendar, label: "Calendar", href: "/schedule" },
  { icon: BarChart3, label: "Analytics", href: "/analytics" },
  { icon: Video, label: "Media", href: "/media" },
  { icon: Bot, label: "AI Assistant", href: "/assistant" },
];

const bottomItems = [
  { icon: Settings, label: "Settings", href: "/settings" },
];

export function Sidebar() {
  const { sidebarOpen, setSidebarOpen } = useAppStore();

  useKeyboardShortcut("b", () => setSidebarOpen(!sidebarOpen));

  if (!sidebarOpen) return null;

  return (
    <aside className="hidden md:flex w-[260px] flex-col border-r border-[#232323] bg-[#090909] p-4 transition-all duration-300">
      <div className="flex items-center h-12 px-2 mb-6">
        <div className="h-6 w-6 rounded bg-white mr-3"></div>
        <span className="text-lg font-semibold tracking-tight text-white">ReCastr</span>
      </div>

      <nav className="flex-1 space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              className="group flex h-10 items-center gap-3 rounded-[12px] px-3 text-sm font-medium text-[#8A8A8A] transition-colors hover:bg-[#151515] hover:text-white"
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-4 border-t border-[#232323]">
        <nav className="space-y-1">
          {bottomItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                className="group flex h-10 items-center gap-3 rounded-[12px] px-3 text-sm font-medium text-[#8A8A8A] transition-colors hover:bg-[#151515] hover:text-white"
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
