"use client";

import { MoreHorizontal, Edit, Copy, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TableRowMenu() {
  return (
    <div className="relative flex justify-end">
      <Button variant="ghost" size="icon" className="h-8 w-8 text-[#8A8A8A] hover:text-white hover:bg-[#232323]">
        <MoreHorizontal className="h-4 w-4" />
      </Button>
      {/* 
        Dropdown logic would go here. For UI purposes, we're just rendering the trigger.
        When open, it should render items like:
        <Eye /> View
        <Edit /> Edit
        <Copy /> Duplicate
        <Trash2 /> Delete
      */}
    </div>
  );
}
