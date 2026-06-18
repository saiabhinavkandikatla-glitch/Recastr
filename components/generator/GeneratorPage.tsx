"use client";

import { useState } from "react";
import { SourceUploadCard } from "./SourceUploadCard";
import { PlatformTabs } from "./PlatformTabs";
import { GenerationProgress } from "./GenerationProgress";
import { GeneratedContentCard } from "./GeneratedContentCard";

export function GeneratorPage() {
  const [selectedPlatform, setSelectedPlatform] = useState("twitter");
  
  // This is a dummy state for UI demonstration purposes
  const [pipelineState, setPipelineState] = useState<"idle" | "processing" | "completed">("idle");

  const mockSteps = [
    { id: "1", label: "Extracting Transcript", status: "completed" as const },
    { id: "2", label: "Analyzing Content", status: "processing" as const },
    { id: "3", label: "Generating Output", status: "pending" as const },
  ];

  const mockOutput = `1/ Just finished analyzing the latest engineering updates. Here are the key takeaways you need to know 🧵👇\n\n2/ We've improved build times by 40% using the new caching strategy. This is a game-changer for developer productivity.\n\n3/ The new design system is fully implemented. Expect a much cleaner, high-contrast UI across all dashboard views.`;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-white tracking-tight">Generate Content</h1>
        <p className="text-[#8A8A8A]">Transform any source into platform-specific content in seconds.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <SourceUploadCard />
          <PlatformTabs selected={selectedPlatform} onSelect={setSelectedPlatform} />
          
          {pipelineState === "completed" && (
            <GeneratedContentCard 
              platform={selectedPlatform} 
              content={mockOutput} 
            />
          )}
        </div>
        
        <div className="space-y-6">
          <GenerationProgress steps={mockSteps} />
        </div>
      </div>
    </div>
  );
}
