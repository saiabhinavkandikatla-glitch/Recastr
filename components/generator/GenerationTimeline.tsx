"use client";

import { Check, Loader2 } from "lucide-react";

export function GenerationTimeline() {
  return (
    <div className="rounded-[32px] border border-[#232323] bg-[#151515] p-6">
      <h3 className="text-sm font-medium text-white mb-6">Pipeline Progress</h3>
      <div className="space-y-6">
        <div className="relative flex gap-4">
          <div className="absolute left-[11px] top-8 h-full w-px -translate-x-1/2 bg-emerald-500" />
          <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#090909]">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500">
              <Check className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="flex flex-col pb-6">
            <span className="text-sm font-medium text-white">Extract Transcript</span>
          </div>
        </div>

        <div className="relative flex gap-4">
          <div className="absolute left-[11px] top-8 h-full w-px -translate-x-1/2 bg-[#232323]" />
          <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#090909]">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/20 text-blue-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            </div>
          </div>
          <div className="flex flex-col pb-6">
            <span className="text-sm font-medium text-blue-500">Generate Content</span>
            <span className="text-xs text-[#8A8A8A] mt-1">Analyzing context...</span>
          </div>
        </div>
      </div>
    </div>
  );
}
