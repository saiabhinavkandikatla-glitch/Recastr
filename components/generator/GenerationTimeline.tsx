"use client";

import { Check, Loader2, Sparkles } from "lucide-react";
import { useGenerator } from "./GeneratorProvider";

export function GenerationTimeline() {
  const { progress, generate, isGenerating, project, selectedPlatforms } = useGenerator();

  return (
    <div className="rounded-[32px] border border-[#232323] bg-[#151515] p-5">
      <h3 className="text-base font-semibold text-white mb-4">Pipeline Progress</h3>
      <div className="space-y-5">
        {/* Step 1: Extract */}
        <div className="relative flex gap-4">
          <div className="absolute left-[11px] top-8 h-full w-px -translate-x-1/2 bg-[#232323]" />
          <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#090909]">
            {progress === "idle" ? (
              <div className="h-2 w-2 rounded-full bg-[#232323]" />
            ) : progress === "extracting" ? (
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/20 text-blue-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              </div>
            ) : (
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500">
                <Check className="h-3.5 w-3.5" />
              </div>
            )}
          </div>
          <div className="flex flex-col pb-6">
            <span className={`text-sm font-medium ${progress !== "idle" ? "text-white" : "text-[#8A8A8A]"}`}>
              Extract Transcript
            </span>
          </div>
        </div>

        {/* Step 2: Generate Content */}
        <div className="relative flex gap-4">
          <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#090909]">
            {progress === "completed" ? (
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500">
                <Check className="h-3.5 w-3.5" />
              </div>
            ) : progress === "generating" ? (
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-500/20 text-purple-500">
                <Sparkles className="h-3.5 w-3.5 animate-pulse" />
              </div>
            ) : (
              <div className="h-2 w-2 rounded-full bg-[#232323]" />
            )}
          </div>
          <div className="flex flex-col pb-6">
            <span className={`text-sm font-medium ${progress === "completed" || progress === "generating" ? "text-white" : "text-[#8A8A8A]"}`}>
              Generate Posts
            </span>
            {progress === "generating" && (
              <span className="text-xs text-purple-500 mt-1">Writing content for selected platforms...</span>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={generate}
        disabled={!project || selectedPlatforms.length === 0 || isGenerating}
        className="w-full mt-6 flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 py-3 text-sm font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isGenerating ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</>
        ) : (
          <><Sparkles className="h-4 w-4" /> Generate Content</>
        )}
      </button>
    </div>
  );
}
