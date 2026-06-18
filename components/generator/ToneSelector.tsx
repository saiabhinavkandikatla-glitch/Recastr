"use client";

import { useGenerator } from "./GeneratorProvider";

const rewriteModes = [
  "Professional",
  "Casual",
  "Storytelling",
  "Viral",
  "Educational",
  "Founder",
  "Personal Brand"
];

export function ToneSelector() {
  const { tone, setTone, isGenerating } = useGenerator();

  return (
    <div className="rounded-[32px] border border-[#232323] bg-[#151515] p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold text-white">Rewrite Mode</h3>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {rewriteModes.map((mode) => {
          const isSelected = tone === mode;
          
          return (
            <button
              key={mode}
              onClick={() => setTone(mode)}
              disabled={isGenerating}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                isSelected
                  ? "border-blue-500 bg-blue-500/10 text-blue-500"
                  : "border-[#232323] bg-[#090909] text-[#8A8A8A] hover:bg-[#232323] hover:text-white"
              }`}
            >
              {mode}
            </button>
          );
        })}
      </div>
    </div>
  );
}
