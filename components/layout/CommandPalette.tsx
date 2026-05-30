"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Folder,
  LayoutDashboard,
  ListChecks,
  Settings,
  Sparkles,
} from "lucide-react";
import { Command } from "cmdk";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { Project } from "@/lib/types";

export function CommandPalette({
  open,
  onOpenChange,
  projects = [],
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects?: Project[];
}) {
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  const runCommand = (command: () => void) => {
    onOpenChange(false);
    command();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 shadow-2xl glass-modal sm:max-w-[600px] border-white/10 rounded-[16px]">
        <Command className="flex h-full w-full flex-col bg-transparent text-foreground">
          <div className="flex items-center border-b px-4 border-white/5">
            <Sparkles className="mr-2 h-4 w-4 shrink-0 text-primary" />
            <Command.Input
              className="flex h-14 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Type a command or search..."
            />
          </div>
          <Command.List className="max-h-[300px] overflow-y-auto overflow-x-hidden p-2">
            <Command.Empty className="py-6 text-center text-sm">
              No results found.
            </Command.Empty>
            <Command.Group heading="Navigation" className="px-2 text-xs font-medium text-muted-foreground mb-2">
              <Command.Item
                onSelect={() => runCommand(() => router.push("/dashboard"))}
                className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none aria-selected:bg-primary/10 aria-selected:text-primary data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
              >
                <LayoutDashboard className="mr-2 h-4 w-4" />
                <span>Dashboard</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => router.push("/projects"))}
                className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none aria-selected:bg-primary/10 aria-selected:text-primary data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
              >
                <Folder className="mr-2 h-4 w-4" />
                <span>Projects</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => router.push("/schedule"))}
                className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none aria-selected:bg-primary/10 aria-selected:text-primary data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
              >
                <CalendarDays className="mr-2 h-4 w-4" />
                <span>Schedule</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => router.push("/tasks"))}
                className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none aria-selected:bg-primary/10 aria-selected:text-primary data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
              >
                <ListChecks className="mr-2 h-4 w-4" />
                <span>Tasks</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => router.push("/settings"))}
                className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none aria-selected:bg-primary/10 aria-selected:text-primary data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
              >
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </Command.Item>
            </Command.Group>

            {projects.length > 0 && (
              <Command.Group heading="Projects" className="px-2 text-xs font-medium text-muted-foreground mt-4 mb-2">
                {projects.map((project) => (
                  <Command.Item
                    key={project.id}
                    value={`project ${project.title}`}
                    onSelect={() => runCommand(() => router.push(`/projects/${project.id}`))}
                    className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none aria-selected:bg-primary/10 aria-selected:text-primary data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                  >
                    <Folder className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>{project.title}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
