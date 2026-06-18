"use client";

import { Search, Filter, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TableToolbar() {
  return (
    <div className="flex items-center justify-between py-4">
      <div className="flex flex-1 items-center gap-2">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[#8A8A8A]" />
          <input
            placeholder="Search all columns..."
            className="h-9 w-full rounded-md border border-[#232323] bg-[#090909] pl-9 pr-4 text-sm text-white placeholder:text-[#8A8A8A] focus:border-[#8A8A8A] focus:outline-none"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="h-9 border-[#232323] bg-[#090909] text-[#8A8A8A] hover:text-white hover:bg-[#151515]">
          <Filter className="mr-2 h-4 w-4" />
          Filter
        </Button>
        <Button variant="outline" size="sm" className="h-9 border-[#232323] bg-[#090909] text-[#8A8A8A] hover:text-white hover:bg-[#151515]">
          <SlidersHorizontal className="mr-2 h-4 w-4" />
          View
        </Button>
      </div>
    </div>
  );
}
