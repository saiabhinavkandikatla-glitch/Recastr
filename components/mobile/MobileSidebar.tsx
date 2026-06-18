"use client";

import { useAppStore } from "@/store/app-store";
import { X } from "lucide-react";
import Link from "next/link";
import { LayoutDashboard, Sparkles, FolderOpen, Calendar, BarChart3, Settings, CreditCard, Video, Bot } from "lucide-react";

export function MobileSidebar() {
  const { sidebarOpen, setSidebarOpen } = useAppStore();

  const items = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
    { icon: Sparkles, label: "Generator", href: "/generate" },
    { icon: FolderOpen, label: "Projects", href: "/projects" },
    { icon: Calendar, label: "Calendar", href: "/schedule" },
    { icon: BarChart3, label: "Analytics", href: "/analytics" },
    { icon: Video, label: "Media", href: "/media" },
    { icon: Bot, label: "AI Assistant", href: "/assistant" },
    { icon: CreditCard, label: "Billing", href: "/billing" },
    { icon: Settings, label: "Settings", href: "/settings" },
  ];

  if (!sidebarOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 z-40 bg-[#090909]/80 backdrop-blur-sm md:hidden" 
        onClick={() => setSidebarOpen(false)}
      />
      <div className="fixed inset-y-0 left-0 z-50 w-[280px] bg-[#090909] border-r border-[#232323] p-6 shadow-2xl transition-transform duration-300 md:hidden flex flex-col">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <div className="h-6 w-6 rounded bg-white mr-3"></div>
            <span className="text-xl font-bold tracking-tight text-white">ReCastr</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="text-[#8A8A8A] hover:text-white">
            <X className="h-6 w-6" />
          </button>
        </div>
        <nav className="flex-1 space-y-2 overflow-y-auto">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className="group flex h-12 items-center gap-4 rounded-xl px-4 text-base font-medium text-[#8A8A8A] transition-colors hover:bg-[#151515] hover:text-white"
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
