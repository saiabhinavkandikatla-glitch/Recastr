"use client";

import { useState } from "react";
import { Upload, Link as LinkIcon, FileText, Youtube } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function SourceUploadCard() {
  const [sourceType, setSourceType] = useState<"url" | "text" | "upload" | "youtube">("youtube");

  return (
    <Card className="flex flex-col bg-[#090909] border-[#232323] overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center border-b border-[#232323]">
        <button
          onClick={() => setSourceType("youtube")}
          className={`flex-1 flex items-center justify-center gap-2 p-4 text-sm font-medium transition-colors border-b-2 sm:border-b-0 sm:border-r ${
            sourceType === "youtube"
              ? "bg-[#151515] border-white text-white sm:border-b-2 sm:border-r-[#232323]"
              : "border-transparent sm:border-r-[#232323] text-[#8A8A8A] hover:text-white hover:bg-[#151515]"
          }`}
        >
          <Youtube className="h-4 w-4" /> YouTube Video
        </button>
        <button
          onClick={() => setSourceType("url")}
          className={`flex-1 flex items-center justify-center gap-2 p-4 text-sm font-medium transition-colors border-b-2 sm:border-b-0 sm:border-r ${
            sourceType === "url"
              ? "bg-[#151515] border-white text-white sm:border-b-2 sm:border-r-[#232323]"
              : "border-transparent sm:border-r-[#232323] text-[#8A8A8A] hover:text-white hover:bg-[#151515]"
          }`}
        >
          <LinkIcon className="h-4 w-4" /> Article URL
        </button>
        <button
          onClick={() => setSourceType("text")}
          className={`flex-1 flex items-center justify-center gap-2 p-4 text-sm font-medium transition-colors border-b-2 sm:border-b-0 ${
            sourceType === "text"
              ? "bg-[#151515] border-white text-white sm:border-b-2"
              : "border-transparent text-[#8A8A8A] hover:text-white hover:bg-[#151515]"
          }`}
        >
          <FileText className="h-4 w-4" /> Paste Text
        </button>
      </div>

      <div className="p-6">
        {sourceType === "youtube" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">YouTube URL</label>
              <Input
                placeholder="https://youtube.com/watch?v=..."
                className="bg-[#151515] border-[#232323] text-white placeholder:text-[#8A8A8A]"
              />
            </div>
            <p className="text-xs text-[#8A8A8A]">
              We'll automatically extract the transcript and key moments from the video.
            </p>
          </div>
        )}

        {sourceType === "url" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Article or Blog URL</label>
              <Input
                placeholder="https://..."
                className="bg-[#151515] border-[#232323] text-white placeholder:text-[#8A8A8A]"
              />
            </div>
          </div>
        )}

        {sourceType === "text" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Raw Text</label>
              <textarea
                rows={5}
                placeholder="Paste your content here..."
                className="w-full rounded-md border border-[#232323] bg-[#151515] px-3 py-2 text-sm text-white placeholder:text-[#8A8A8A] focus:outline-none focus:ring-2 focus:ring-white/20"
              />
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <Button className="bg-white text-black hover:bg-zinc-200">
            Process Source
          </Button>
        </div>
      </div>
    </Card>
  );
}
