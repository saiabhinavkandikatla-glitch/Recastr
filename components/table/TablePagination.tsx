"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TablePagination() {
  return (
    <div className="flex items-center justify-between px-4 py-4">
      <div className="text-sm text-[#8A8A8A]">
        Showing 1 to 10 of 42 results
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" className="h-8 w-8 border-[#232323] bg-[#090909] text-[#8A8A8A] hover:bg-[#151515] hover:text-white" disabled>
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" className="h-8 w-8 border-[#232323] bg-[#090909] text-[#8A8A8A] hover:bg-[#151515] hover:text-white" disabled>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center justify-center text-sm font-medium text-white px-2">
          Page 1 of 5
        </div>
        <Button variant="outline" size="icon" className="h-8 w-8 border-[#232323] bg-[#090909] text-[#8A8A8A] hover:bg-[#151515] hover:text-white">
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" className="h-8 w-8 border-[#232323] bg-[#090909] text-[#8A8A8A] hover:bg-[#151515] hover:text-white">
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
