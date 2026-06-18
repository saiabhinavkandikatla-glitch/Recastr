"use client";

import { Search } from "lucide-react";
import { useKeyboardShortcut } from "@/hooks/useKeyboardShortcut";

export function SearchBar() {
  // We'll wire this to the Command Palette in Phase 10D
  const openCommandPalette = () => {
    document.dispatchEvent(new KeyboardEvent("keydown", { metaKey: true, key: "k" }));
  };

  return (
    <button
      onClick={openCommandPalette}
      className="flex h-9 w-full items-center gap-2 rounded-xl border border-[#232323] bg-[#111111] px-3 text-sm text-[#8A8A8A] transition-colors hover:border-[#8A8A8A] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
    >
      <Search className="h-4 w-4 shrink-0" />
      <span className="flex-1 text-left">Search...</span>
      <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-[#232323] bg-[#090909] px-1.5 font-mono text-[10px] font-medium text-[#8A8A8A]">
        <span className="text-xs">⌘</span>K
      </kbd>
    </button>
  );
}
