"use client";

import { useGenerator } from "./GeneratorProvider";
import { Copy, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { Platform } from "@/lib/types";
import { TwitterPreview } from "../preview/TwitterPreview";
import { LinkedInPreview } from "../preview/LinkedInPreview";
import { InstagramPreview } from "../preview/InstagramPreview";
import { FacebookPreview } from "../preview/FacebookPreview";
import { ThreadsPreview } from "../preview/ThreadsPreview";
import { CarouselPreview } from "../preview/CarouselPreview";
import { GenericPreview } from "../preview/GenericPreview";

const platformNames: Record<Platform, string> = {
  TWITTER: "Twitter/X",
  LINKEDIN: "LinkedIn",
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  THREADS: "Threads",
  YOUTUBE: "YouTube Shorts",
  CAROUSEL: "Carousel",
  COMMUNITY: "Community",
  STORY: "Story",
  HOOKS: "10 Hooks",
  CTA: "CTAs"
};

export function PreviewCard() {
  const { outputs, isGenerating, progress, activePreviewTab, setActivePreviewTab, selectedPlatforms } = useGenerator();

  if (progress === "idle") {
    return (
      <div className="flex h-full items-center justify-center rounded-2xl border-2 border-dashed border-[#232323] bg-[#090909]">
        <div className="max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#151515] border border-[#232323]">
            <Sparkles className="h-5 w-5 text-[#8A8A8A]" />
          </div>
          <h2 className="text-base font-semibold text-white mb-2">Ready to Generate</h2>
          <p className="text-sm text-[#8A8A8A]">Select your desired platforms and click Generate Content to begin.</p>
        </div>
      </div>
    );
  }

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-[#232323] pb-4 mb-6">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {selectedPlatforms.map((platform) => {
            const hasOutput = outputs.some((o) => o.platform === platform);
            const isActive = activePreviewTab === platform;
            
            return (
              <button
                key={platform}
                onClick={() => hasOutput && setActivePreviewTab(platform)}
                disabled={!hasOutput}
                className={`px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-colors ${
                  isActive 
                    ? "bg-white text-black" 
                    : hasOutput 
                      ? "bg-[#151515] text-[#8A8A8A] hover:text-white" 
                      : "opacity-50 cursor-not-allowed text-[#8A8A8A]"
                }`}
              >
                {platformNames[platform] || platform}
              </button>
            );
          })}
        </div>
        
        {isGenerating && (
          <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-500 flex items-center gap-2 shrink-0">
            <RefreshCw className="h-3 w-3 animate-spin" /> Generating...
          </span>
        )}
        {!isGenerating && progress === "completed" && (
          <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-500 shrink-0">
            Completed
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto pr-4 scrollbar-thin">
        {isGenerating && !outputs.some((o) => o.platform === activePreviewTab) ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-4 w-3/4 rounded bg-[#232323]"></div>
            <div className="h-4 w-full rounded bg-[#232323]"></div>
            <div className="h-4 w-5/6 rounded bg-[#232323]"></div>
            <div className="h-4 w-full rounded bg-[#232323]"></div>
            <div className="h-4 w-2/3 rounded bg-[#232323]"></div>
          </div>
        ) : (
          outputs
            .filter((o) => o.platform === activePreviewTab)
            .map((output) => {
              let PreviewComponent;
              switch (activePreviewTab) {
                case "TWITTER":
                  PreviewComponent = <TwitterPreview content={output.content as string} />;
                  break;
                case "LINKEDIN":
                  PreviewComponent = <LinkedInPreview content={output.content as string} />;
                  break;
                case "INSTAGRAM":
                  PreviewComponent = <InstagramPreview content={output.content as string} />;
                  break;
                case "FACEBOOK":
                  PreviewComponent = <FacebookPreview content={output.content as string} />;
                  break;
                case "THREADS":
                  PreviewComponent = <ThreadsPreview content={output.content as string} />;
                  break;
                case "CAROUSEL":
                  PreviewComponent = <CarouselPreview content={output.content as string} />;
                  break;
                default:
                  PreviewComponent = <GenericPreview content={output.content as string} platform={platformNames[activePreviewTab]} />;
                  break;
              }

              return (
                <div key={output.id} className="relative group w-full pt-8">
                  <div className="absolute top-0 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                    <Button 
                      variant="secondary" 
                      size="sm"
                      className="bg-[#151515] hover:bg-[#232323] text-white border border-[#333] rounded-full px-4"
                      onClick={() => handleCopy(output.content as string)}
                    >
                      <Copy className="h-4 w-4 mr-2" /> Copy text
                    </Button>
                  </div>
                  
                  <div className="flex justify-center w-full pb-8">
                    {PreviewComponent}
                  </div>
                </div>
              );
            })
        )}
      </div>
    </div>
  );
}
