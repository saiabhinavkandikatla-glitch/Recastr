"use client";

import { Sparkles, Plus, LayoutDashboard, Settings } from "lucide-react";

const icons = {
  Sparkles,
  Plus,
  LayoutDashboard,
  Settings,
};

interface CommandItemProps {
  icon: keyof typeof icons;
  label: string;
  shortcut?: string;
}

export function CommandItem({ icon, label, shortcut }: CommandItemProps) {
  const Icon = icons[icon];

  return (
    <button className="flex w-full items-center justify-between rounded-lg px-3 py-3 text-sm text-white transition-colors hover:bg-[#232323]">
      <div className="flex items-center gap-3">
        <Icon className="h-4 w-4 text-[#8A8A8A]" />
        <span>{label}</span>
      </div>
      {shortcut && (
        <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-[#232323] bg-[#090909] px-1.5 font-mono text-[10px] font-medium text-[#8A8A8A]">
          <span className="text-xs">⌘</span>{shortcut}
        </kbd>
      )}
    </button>
  );
}
