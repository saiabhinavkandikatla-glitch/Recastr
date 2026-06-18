"use client";

import { MessageCircle, Briefcase, Users, Image as ImageIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useGenerator } from "./GeneratorProvider";
import { Button } from "@/components/ui/button";

const platforms = [
  { id: "TWITTER", name: "Twitter Thread", icon: MessageCircle },
  { id: "LINKEDIN", name: "LinkedIn Post", icon: Briefcase },
  { id: "INSTAGRAM", name: "Instagram Caption", icon: ImageIcon },
  { id: "FACEBOOK", name: "Facebook Post", icon: Users },
] as const;

export function PlatformTabs() {
  const { selectedPlatforms, togglePlatform, isGenerating, generate } = useGenerator();

  return (
    <Card className="bg-[#090909] border-[#232323] overflow-hidden flex flex-col">
      <div className="p-4 border-b border-[#232323] flex items-center justify-between">
        <h3 className="font-medium text-white">Select Output Format</h3>
      </div>
      <div className="p-4 flex-1">
        <div className="grid grid-cols-2 md:grid-cols-2 gap-3 mb-6">
          {platforms.map((platform) => {
            const Icon = platform.icon;
            const isSelected = selectedPlatforms.includes(platform.id);
            
            return (
              <button
                key={platform.id}
                onClick={() => togglePlatform(platform.id)}
                disabled={isGenerating}
                className={`flex flex-col items-center justify-center gap-3 p-4 rounded-xl border transition-all ${
                  isSelected
                    ? "border-white bg-[#151515] text-white"
                    : "border-[#232323] bg-[#090909] text-[#8A8A8A] hover:bg-[#151515] hover:text-white"
                }`}
              >
                <Icon className={`h-6 w-6 ${isSelected ? "text-blue-500" : ""}`} />
                <span className="text-sm font-medium">{platform.name}</span>
              </button>
            );
          })}
        </div>
        <Button 
          className="w-full bg-white text-black hover:bg-gray-200 h-12 rounded-xl text-base font-semibold"
          onClick={generate}
          disabled={isGenerating || selectedPlatforms.length === 0}
        >
          {isGenerating ? "Generating Content..." : "Generate Content"}
        </Button>
      </div>
    </Card>
  );
}
