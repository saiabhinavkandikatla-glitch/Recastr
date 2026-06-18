import React from "react";

export function GenericPreview({ content, platform }: { content: string, platform: string }) {
  const parts = content.split("---").map(t => t.trim()).filter(Boolean);

  return (
    <div className="mx-auto w-full max-w-[600px] flex flex-col gap-4">
      {parts.map((part, index) => (
        <div key={index} className="rounded-xl border border-[#232323] bg-[#090909] p-5 shadow-sm">
          {parts.length > 1 && (
            <div className="mb-2 text-xs font-bold text-[#8A8A8A] uppercase tracking-wider">
              {platform} {index + 1}
            </div>
          )}
          <div className="whitespace-pre-wrap text-[15px] leading-relaxed text-[#E0E0E0]">
            {part}
          </div>
        </div>
      ))}
    </div>
  );
}
