"use client";

import { Bot, User } from "lucide-react";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
}

export function MessageBubble({ role, content }: MessageBubbleProps) {
  const isUser = role === "user";

  return (
    <div className={`flex gap-4 ${isUser ? "flex-row-reverse" : ""}`}>
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isUser ? "bg-[#232323] text-white" : "bg-blue-600 text-white"}`}>
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div className={`rounded-2xl px-5 py-3 text-sm ${isUser ? "bg-[#232323] text-white" : "bg-[#151515] text-white border border-[#232323]"}`}>
        {content}
      </div>
    </div>
  );
}
