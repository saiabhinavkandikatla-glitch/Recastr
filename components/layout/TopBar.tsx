"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Bell, Keyboard, Search, Settings, UserCircle, ChevronRight } from "lucide-react";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CurrentUser } from "@/lib/current-user";
import { cn } from "@/lib/utils";

export function TopBar({
  title,
  sourceBadge,
  user,
  onOpenCommandPalette,
}: {
  title: string;
  sourceBadge?: string;
  user?: CurrentUser | null;
  onOpenCommandPalette: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const breadcrumb = useMemo(() => makeBreadcrumb(pathname, title, sourceBadge), [pathname, sourceBadge, title]);
  const displayName = user?.name ?? user?.email?.split("@")[0] ?? "Creator";
  const depth = pathname.split("/").filter(Boolean).length;

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  return (
    <header className="sticky top-0 z-40 flex h-[var(--topbar-height)] items-center gap-4 border-b border-white/10 bg-[#090E1D]/95 px-4 backdrop-blur-xl sm:px-6">
      {depth > 1 ? (
        <Button
          aria-label="Go back"
          className="hidden h-9 gap-1.5 rounded-full px-3 sm:inline-flex"
          onClick={() => router.back()}
          size="sm"
          variant="ghost"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center text-[14px]">
          <AnimatePresence mode="popLayout">
            {breadcrumb.map((item, index) => (
              <motion.div
                key={`${item}-${index}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                className="flex items-center"
              >
                {index > 0 && <ChevronRight className="mx-2 h-4 w-4 text-muted-foreground/50" />}
                <span className={cn(
                  "truncate transition-colors",
                  index === breadcrumb.length - 1
                    ? "font-semibold text-foreground"
                    : "font-medium text-muted-foreground hover:text-foreground cursor-pointer"
                )}>
                  {item}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        {sourceBadge && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="hidden truncate text-xs font-medium text-muted-foreground sm:block mt-0.5"
          >
            {sourceBadge}
          </motion.p>
        )}
      </div>

      <div className="hidden items-center md:flex">
        <button
          onClick={onOpenCommandPalette}
          className="group flex h-9 w-[280px] shrink-0 items-center gap-2 overflow-hidden rounded-full border border-border/50 bg-card/50 px-3 text-sm text-muted-foreground transition-colors duration-150 hover:border-primary/50 hover:bg-card"
        >
          <Search className="h-4 w-4 shrink-0 transition-colors group-hover:text-primary" />
          <span className="flex-1 text-left">Search or jump to...</span>
          <kbd className="inline-flex h-5 items-center gap-1 rounded border border-border/50 bg-background px-1.5 font-mono text-[10px] font-medium">
            <span className="text-xs">⌘</span>K
          </kbd>
        </button>
      </div>

      <div className="flex items-center gap-2 lg:gap-3">
        <Button
          aria-label="Notifications"
          size="icon"
          variant="ghost"
          className="relative h-9 w-9 rounded-full hover:bg-muted/80"
        >
          <Bell className="h-[18px] w-[18px] text-muted-foreground transition-colors hover:text-foreground" />
          <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 ring-2 ring-background" />
        </Button>

        <div className="hidden sm:block">
          <ThemeToggle />
        </div>

        {user ? (
          <div ref={menuRef} className="relative">
            <button
              type="button"
              aria-expanded={menuOpen}
              aria-label="Open user menu"
              onClick={() => setMenuOpen((current) => !current)}
              className="flex h-9 items-center gap-2 rounded-full border border-border/50 bg-card/50 pl-1 pr-3 text-sm transition-all hover:bg-card hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 text-xs font-semibold text-white shadow-sm">
                {displayName.slice(0, 1).toUpperCase()}
              </span>
              <span className="hidden max-w-32 truncate font-medium md:inline">{displayName}</span>
            </button>

            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="absolute right-0 top-12 w-64 overflow-hidden rounded-[16px] border border-border/50 bg-card/95 backdrop-blur-xl shadow-2xl origin-top-right"
                >
                  <div className="border-b border-border/50 p-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 text-sm font-bold text-white shadow-sm">
                        {displayName.slice(0, 1).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
                        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <Badge className="mt-3 bg-primary/10 text-primary hover:bg-primary/20 border-primary/20" variant="muted">
                      {user.plan} Plan
                    </Badge>
                  </div>
                  <div className="p-2 space-y-1">
                    <Link
                      href="/settings"
                      className="flex h-9 items-center gap-2.5 rounded-lg px-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      onClick={() => setMenuOpen(false)}
                    >
                      <Settings className="h-4 w-4" />
                      Profile settings
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onOpenCommandPalette();
                      }}
                      className="flex h-9 w-full items-center gap-2.5 rounded-lg px-2 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <Keyboard className="h-4 w-4" />
                      Command menu
                      <kbd className="ml-auto inline-flex h-5 items-center rounded border border-border/50 bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                        ⌘K
                      </kbd>
                    </button>
                  </div>
                  <div className="border-t border-border/50 p-2 bg-muted/20">
                    <LogoutButton />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <Button asChild size="sm" className="rounded-full bg-foreground text-background hover:bg-foreground/90">
            <Link href="/login">
              <UserCircle className="mr-2 h-4 w-4" />
              Sign in
            </Link>
          </Button>
        )}
      </div>
    </header>
  );
}

function makeBreadcrumb(pathname: string, fallbackTitle: string, sourceBadge?: string) {
  if (pathname.startsWith("/projects/")) return ["Projects", sourceBadge ?? fallbackTitle];
  if (pathname.startsWith("/projects")) return ["Projects"];
  if (pathname.startsWith("/schedule")) return ["Schedule"];
  if (pathname.startsWith("/tasks")) return ["Tasks"];
  if (pathname.startsWith("/settings")) return ["Settings"];
  if (pathname.startsWith("/onboarding")) return ["Onboarding"];
  return [fallbackTitle];
}
