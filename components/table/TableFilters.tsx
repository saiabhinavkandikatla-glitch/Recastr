"use client";

import { Check, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TableFilters() {
  return (
    <div className="flex items-center gap-2 border-b border-[#232323] px-4 py-2">
      <span className="text-xs font-medium text-[#8A8A8A]">Active filters:</span>
      <div className="flex items-center gap-1 rounded-md border border-dashed border-[#232323] bg-[#090909] px-2 py-1 text-xs text-white">
        Status <span className="ml-1 text-[#8A8A8A]">is</span> <span className="ml-1 text-emerald-500">Published</span>
      </div>
      <Button variant="ghost" size="sm" className="h-6 gap-1 px-2 text-xs text-[#8A8A8A] hover:bg-[#151515] hover:text-white">
        <PlusCircle className="h-3 w-3" />
        Add filter
      </Button>
    </div>
  );
}
