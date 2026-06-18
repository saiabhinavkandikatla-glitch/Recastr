"use client";

import { Search } from "lucide-react";

export function CommandInput() {
  return (
    <div className="flex items-center border-b border-[#232323] px-4">
      <Search className="h-5 w-5 text-[#8A8A8A]" />
      <input
        autoFocus
        placeholder="Type a command or search..."
        className="flex h-14 w-full rounded-md bg-transparent px-3 py-3 text-sm text-white placeholder:text-[#8A8A8A] focus:outline-none"
      />
    </div>
  );
}
