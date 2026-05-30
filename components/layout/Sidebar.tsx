"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  CalendarDays,
  Folder,
  LayoutDashboard,
  ListChecks,
  Settings,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { CurrentUser } from "@/lib/current-user";
import { cn } from "@/lib/utils";
import type { Project } from "@/lib/types";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: Folder },
  { href: "/schedule", label: "Schedule", icon: CalendarDays },
  { href: "/tasks", label: "Tasks", icon: ListChecks },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({
  projects,
  user,
}: {
  projects: Project[];
  user?: CurrentUser | null;
}) {
  const pathname = usePathname();
  // Fallback to minimal state if no user, removing "Demo creator" hardcoding
  const displayName = user?.name ?? user?.email?.split("@")[0] ?? "Creator";
  const plan = user?.plan ?? "FREE";
  return (
    <>
      <aside className="z-20 hidden h-screen w-[var(--sidebar-width)] shrink-0 flex-col overflow-hidden border-r border-white/10 bg-[#090E1D] text-foreground lg:flex">
        <div className="flex h-[var(--topbar-height)] items-center gap-3 border-b border-white/10 px-5">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--violet)]">
            <Sparkles className="h-4 w-4 text-white" />
            <div className="absolute inset-0 rounded-xl bg-white/20 opacity-0 transition-opacity hover:opacity-100" />
          </div>
          <div>
            <p className="font-display text-[15px] font-semibold tracking-wide">Recastr</p>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">AI Content Studio</p>
          </div>
        </div>

        <nav className="space-y-1.5 px-3 py-6">
          {navItems.map((item) => (
            <SidebarLink
              key={`${item.href}-${item.label}`}
              active={isActive(pathname, item.href, item.label)}
              href={item.href}
              icon={item.icon}
              label={item.label}
            />
          ))}
        </nav>

        <div className="border-y border-white/10 px-5 py-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Recent Projects
            </p>
            <Badge variant="muted" className="bg-primary/10 text-primary hover:bg-primary/20">
              {projects.length}
            </Badge>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-3 py-4 scrollbar-thin">
          {projects.slice(0, 6).map((project) => {
            const active = pathname === `/projects/${project.id}`;
            return (
              <Link
                href={`/projects/${project.id}`}
                key={project.id}
                className={cn(
                  "group relative flex gap-3 rounded-[12px] border border-transparent p-2 transition-all duration-200",
                  active
                    ? "border-[var(--violet)]/25 bg-[var(--violet)]/10"
                    : "hover:border-white/10 hover:bg-white/[0.04]"
                )}
              >
                <div className="relative h-[38px] w-[38px] shrink-0 overflow-hidden rounded-[10px]">
                  <Image
                    src={project.thumbnailUrl ?? "/og-image.svg"}
                    alt=""
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                </div>
                <div className="min-w-0 flex-1 flex flex-col justify-center">
                  <p className={cn(
                    "truncate text-[13px] font-medium transition-colors",
                    active ? "text-primary" : "group-hover:text-foreground"
                  )}>{project.title}</p>
                  <p className="mt-0.5 text-[11px] font-medium capitalize text-muted-foreground">
                    {project.sourceType.toLowerCase()}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>

        <div className="border-t border-white/10 bg-black/10 p-4">
          {user ? (
            <div className="group flex cursor-pointer items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 transition-all hover:bg-white/[0.07]">
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--violet)] text-sm font-semibold text-white">
                {displayName.slice(0, 1).toUpperCase()}
                <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background bg-green-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{displayName}</p>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{plan} plan</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="h-10 rounded-2xl bg-muted/50 animate-pulse" />
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="fixed inset-x-0 bottom-0 z-50 grid h-16 grid-cols-5 border-t border-white/10 bg-[#090E1D]/95 px-2 backdrop-blur-xl lg:hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href, item.label);
          return (
            <Link
              aria-label={item.label}
              className="relative flex flex-col items-center justify-center gap-1 group"
              href={item.href}
              key={`${item.href}-${item.label}-mobile`}
            >
              {active && (
                <motion.div
                  layoutId="mobile-nav-indicator"
                  className="absolute inset-x-4 top-0 h-[3px] rounded-b-md bg-[var(--violet)]"
                />
              )}
              <div className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full transition-all duration-300",
                active ? "bg-[var(--violet)]/15 text-[var(--violet)]" : "text-muted-foreground group-hover:bg-white/[0.06] group-hover:text-foreground"
              )}>
                <Icon className="h-5 w-5" />
              </div>
              <span className={cn(
                "text-[10px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}>
                {item.label.split(' ')[0]}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

function SidebarLink({
  active,
  href,
  icon: Icon,
  label,
  badge = 0,
}: {
  active: boolean;
  href: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      title={label}
      className={cn(
        "relative flex h-10 items-center gap-3 rounded-[10px] px-3 text-[14px] font-medium transition-all duration-200 group overflow-hidden",
        active
          ? "bg-[var(--violet)]/15 text-[var(--violet)]"
          : "text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
      )}
    >
      {active && (
        <motion.div
          layoutId="sidebar-indicator"
          className="absolute bottom-1.5 left-0 top-1.5 w-[3px] rounded-r-md bg-[var(--violet)]"
          initial={false}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      )}
      <Icon className={cn(
        "h-[18px] w-[18px] transition-colors",
        active ? "text-primary" : "group-hover:text-foreground"
      )} />
      <span className="relative z-10">{label}</span>
      {badge > 0 ? (
        <span className="relative z-10 ml-auto rounded-full bg-primary px-1.5 text-[10px] font-bold leading-4 text-primary-foreground">
          {badge}
        </span>
      ) : null}

      {/* Hover background effect */}
      {!active ? <div className="absolute inset-0 rounded-[10px] opacity-0 transition-opacity group-hover:opacity-100" /> : null}
    </Link>
  );
}

function isActive(pathname: string, href: string, label: string) {
  if (label === "Projects") return pathname.startsWith("/projects");
  if (href === "/dashboard") return pathname === href && label === "Dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}
