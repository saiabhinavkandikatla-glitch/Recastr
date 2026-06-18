"use client";

import { useEffect, useState } from "react";
import { CommandInput } from "./CommandInput";
import { CommandItem } from "./CommandItem";

export function CommandModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <div className="fixed inset-0 bg-[#090909]/80 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="relative z-50 w-full max-w-2xl overflow-hidden rounded-2xl border border-[#232323] bg-[#111111] shadow-2xl animate-in fade-in zoom-in-95">
        <CommandInput />
        <div className="max-h-[60vh] overflow-y-auto p-2">
          <div className="mb-2 px-3 text-xs font-medium text-[#8A8A8A]">Actions</div>
          <CommandItem icon="Sparkles" label="Generate Content" shortcut="G" />
          <CommandItem icon="Plus" label="New Project" shortcut="N" />
          
          <div className="mb-2 mt-4 px-3 text-xs font-medium text-[#8A8A8A]">Navigation</div>
          <CommandItem icon="LayoutDashboard" label="Go to Dashboard" />
          <CommandItem icon="Settings" label="Go to Settings" shortcut="S" />
        </div>
      </div>
    </div>
  );
}
