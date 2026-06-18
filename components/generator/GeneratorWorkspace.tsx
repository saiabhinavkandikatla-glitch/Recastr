"use client";

import { SourceCard } from "./SourceCard";
import { PlatformTabs } from "./PlatformTabs";
import { PreviewCard } from "./PreviewCard";
import { ActionBar } from "./ActionBar";
import { GenerationTimeline } from "./GenerationTimeline";

export function GeneratorWorkspace() {
  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col lg:flex-row gap-6">
      {/* Left Column: Input & Configuration */}
      <div className="flex w-full lg:w-[400px] flex-col gap-6 overflow-y-auto pr-2 scrollbar-thin">
        <SourceCard />
        <PlatformTabs selected="twitter" onSelect={() => {}} />
        <GenerationTimeline />
      </div>

      {/* Right Column: Output & Preview */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-[32px] border border-[#232323] bg-[#111111]">
        <div className="flex-1 overflow-y-auto p-6">
          <PreviewCard />
        </div>
        <ActionBar />
      </div>
    </div>
  );
}
