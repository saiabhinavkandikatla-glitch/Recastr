"use client";

import Link from "next/link";
import { LayoutDashboard, Sparkles, FolderOpen, Bell, Menu } from "lucide-react";
import { usePathname } from "next/navigation";

export function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { icon: LayoutDashboard, label: "Home", href: "/dashboard" },
    { icon: Sparkles, label: "Generate", href: "/generate" },
    { icon: FolderOpen, label: "Projects", href: "/projects" },
    { icon: Bell, label: "Alerts", href: "/notifications" },
    { icon: Menu, label: "More", href: "/menu" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-[#232323] bg-[#090909]/90 backdrop-blur-md pb-safe md:hidden">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        
        return (
          <Link
            key={item.label}
            href={item.href}
            className={`flex flex-col items-center justify-center gap-1 w-16 h-full ${
              isActive ? "text-white" : "text-[#8A8A8A] hover:text-[#D1D1D1]"
            }`}
          >
            <Icon className={`h-5 w-5 ${isActive ? "text-blue-500" : ""}`} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
