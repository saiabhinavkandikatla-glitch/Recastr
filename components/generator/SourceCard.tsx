"use client";

import { FileText, Video, PlayCircle } from "lucide-react";
import { useGenerator } from "./GeneratorProvider";

export function SourceCard() {
  const { project } = useGenerator();

  return (
    <div className="rounded-[32px] border border-[#232323] bg-[#151515] p-5">
      <h3 className="text-base font-semibold text-white mb-3">Source Content</h3>
      
      {project ? (
        <div className="flex items-start gap-3 rounded-xl border border-[#232323] bg-[#090909] p-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-500">
            <PlayCircle className="h-5 w-5" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium text-white truncate">{project.title}</span>
            <span className="text-xs text-[#8A8A8A] mt-1">{project.summary?.tldr || "Source transcript loaded and ready for extraction."}</span>
          </div>
        </div>
      ) : (
        <>
          <div className="flex gap-2 mb-3">
            <button className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#232323] py-2 text-xs font-medium text-white transition-colors">
              <Video className="h-3.5 w-3.5 text-red-500" /> URL
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#090909] border border-[#232323] py-2 text-xs font-medium text-[#8A8A8A] hover:text-white transition-colors">
              <FileText className="h-3.5 w-3.5" /> Text
            </button>
          </div>
          <div className="space-y-2">
            <input
              placeholder="Paste YouTube or Article URL..."
              className="w-full rounded-xl border border-[#232323] bg-[#090909] px-3 py-2.5 text-sm text-white placeholder:text-[#8A8A8A] focus:border-[#8A8A8A] focus:outline-none"
            />
          </div>
        </>
      )}
    </div>
  );
}
