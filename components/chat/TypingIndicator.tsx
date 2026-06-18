"use client";

import { Bot } from "lucide-react";

export function TypingIndicator() {
  return (
    <div className="flex gap-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
        <Bot className="h-4 w-4" />
      </div>
      <div className="flex items-center gap-1 rounded-2xl border border-[#232323] bg-[#151515] px-5 py-4">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#8A8A8A]" style={{ animationDelay: "0ms" }}></span>
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#8A8A8A]" style={{ animationDelay: "150ms" }}></span>
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#8A8A8A]" style={{ animationDelay: "300ms" }}></span>
      </div>
    </div>
  );
}
