"use client";

import { Copy, Save, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ActionBar() {
  return (
    <div className="flex items-center justify-between border-t border-[#232323] bg-[#151515] p-4">
      <div className="flex gap-2">
        <Button variant="outline" className="gap-2 border-[#232323] bg-[#090909] text-white hover:bg-[#232323]">
          <Copy className="h-4 w-4" /> Copy
        </Button>
        <Button variant="outline" className="gap-2 border-[#232323] bg-[#090909] text-white hover:bg-[#232323]">
          <Share2 className="h-4 w-4" /> Share
        </Button>
      </div>
      <Button className="gap-2 bg-white text-black hover:bg-zinc-200">
        <Save className="h-4 w-4" /> Save to Project
      </Button>
    </div>
  );
}
