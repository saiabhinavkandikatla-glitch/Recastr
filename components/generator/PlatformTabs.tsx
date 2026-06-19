"use client";

import { useGenerator } from "./GeneratorProvider";
import { Check } from "lucide-react";
import type { Platform } from "@/lib/types";

const platforms: { id: Platform; name: string }[] = [
  { id: "TWITTER", name: "Twitter/X" },
  { id: "LINKEDIN", name: "LinkedIn" },
  { id: "INSTAGRAM", name: "Instagram" },
  { id: "FACEBOOK", name: "Facebook" },
  { id: "THREADS", name: "Threads" },
  { id: "CAROUSEL", name: "Carousel" },
  { id: "COMMUNITY", name: "YT Community" },
  { id: "HOOKS", name: "10 Hooks" },
  { id: "CTA", name: "CTAs" },
];

export function PlatformTabs() {
  const { selectedPlatforms, togglePlatform, isGenerating, isAnalyzing, project } = useGenerator();

  return (
    <div className="rounded-[32px] border border-[#232323] bg-[#151515] p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Output Platforms</h3>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {platforms.map((platform) => {
          const isSelected = selectedPlatforms.includes(platform.id);
          const isDisabled = isGenerating || isAnalyzing || !project;
          
          return (
            <button
              key={platform.id}
              onClick={() => togglePlatform(platform.id)}
              disabled={isDisabled}
              className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                isSelected
                  ? "border-white bg-white text-black"
                  : "border-[#232323] bg-[#090909] text-[#8A8A8A] hover:bg-[#232323] hover:text-white"
              }`}
            >
              {isSelected && <Check className="h-3.5 w-3.5" />}
              {platform.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
