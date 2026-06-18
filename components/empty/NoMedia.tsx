"use client";

import { VideoOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NoMedia() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-[#232323] bg-[#111111] mb-6">
        <VideoOff className="h-8 w-8 text-[#8A8A8A]" />
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">No media uploaded</h3>
      <p className="text-sm text-[#8A8A8A] max-w-sm mb-8">
        Upload your first video, image, or audio file to get started.
      </p>
      <Button className="bg-white text-black hover:bg-zinc-200">
        Upload Media
      </Button>
    </div>
  );
}
