"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Sparkles, FolderOpen, Calendar, BarChart3, Settings, Video, Bot } from "lucide-react";
import { Logo } from "@/components/Logo";
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
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useAppStore();

  useKeyboardShortcut("b", () => setSidebarOpen(!sidebarOpen));

  if (!sidebarOpen) return null;

  return (
    <aside className="hidden md:flex w-[260px] flex-col border-r border-[#232323] bg-[#090909] p-4 transition-all duration-300">
      <div className="mb-6 px-2">
        <Logo size="sm" className="text-white" />
      </div>

      <nav className="flex-1 space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`group flex h-10 items-center gap-3 rounded-[12px] px-3 text-sm font-medium transition-all duration-300 border ${
                active
                  ? "bg-[#151515] text-white border-white/10 shadow-[0_0_12px_rgba(255,255,255,0.03)]"
                  : "text-[#8A8A8A] border-transparent hover:bg-[#151515]/50 hover:text-white hover:border-white/5 hover:shadow-[0_0_12px_rgba(255,255,255,0.02)]"
              }`}
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
            const active = pathname === item.href || pathname.startsWith(item.href);
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`group flex h-10 items-center gap-3 rounded-[12px] px-3 text-sm font-medium transition-all duration-300 border ${
                  active
                    ? "bg-[#151515] text-white border-white/10 shadow-[0_0_12px_rgba(255,255,255,0.03)]"
                    : "text-[#8A8A8A] border-transparent hover:bg-[#151515]/50 hover:text-white hover:border-white/5 hover:shadow-[0_0_12px_rgba(255,255,255,0.02)]"
                }`}
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
