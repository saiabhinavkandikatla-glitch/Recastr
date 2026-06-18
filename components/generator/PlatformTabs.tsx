"use client";

import { Twitter, Linkedin, Facebook, Instagram, Mail, Globe } from "lucide-react";
import { Card } from "@/components/ui/card";

const platforms = [
  { id: "twitter", name: "Twitter Thread", icon: Twitter },
  { id: "linkedin", name: "LinkedIn Post", icon: Linkedin },
  { id: "blog", name: "Blog Post", icon: Globe },
  { id: "newsletter", name: "Newsletter", icon: Mail },
  { id: "instagram", name: "Instagram Caption", icon: Instagram },
  { id: "facebook", name: "Facebook Post", icon: Facebook },
];

export function PlatformTabs({ selected, onSelect }: { selected: string, onSelect: (id: string) => void }) {
  return (
    <Card className="bg-[#090909] border-[#232323] overflow-hidden">
      <div className="p-4 border-b border-[#232323]">
        <h3 className="font-medium text-white">Select Output Format</h3>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {platforms.map((platform) => {
            const Icon = platform.icon;
            const isSelected = selected === platform.id;
            
            return (
              <button
                key={platform.id}
                onClick={() => onSelect(platform.id)}
                className={`flex flex-col items-center justify-center gap-3 p-4 rounded-xl border transition-all ${
                  isSelected
                    ? "border-white bg-[#151515] text-white"
                    : "border-[#232323] bg-[#090909] text-[#8A8A8A] hover:bg-[#151515] hover:text-white hover:border-zinc-700"
                }`}
              >
                <Icon className={`h-6 w-6 ${isSelected ? "text-blue-500" : ""}`} />
                <span className="text-sm font-medium">{platform.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
