import { ThumbsUp, MessageSquare, Repeat2, Send } from "lucide-react";
import React, { useState } from "react";

export function LinkedInPreview({ content }: { content: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const words = content.split(/\s+/);
  const isLong = words.length > 40;
  
  const displayContent = !isExpanded && isLong 
    ? words.slice(0, 40).join(" ") + "... " 
    : content;

  return (
    <div className="mx-auto w-full max-w-[600px] rounded-xl border border-[#38434F] bg-[#1B1F23] text-white">
      {/* Header */}
      <div className="flex gap-3 p-4">
        <div className="h-12 w-12 shrink-0 rounded-full bg-gradient-to-br from-slate-400 to-slate-600" />
        <div className="flex flex-col">
          <div className="flex items-center gap-1">
            <span className="font-bold text-[15px] hover:text-[#70B5F9] cursor-pointer">Your Brand</span>
            <span className="text-[#8C959F] text-xs font-normal">• 1st</span>
          </div>
          <span className="text-[12px] text-[#8C959F]">Founder & CEO | Building SaaS in Public</span>
          <span className="text-[12px] text-[#8C959F]">Now • 🌐</span>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 pb-2">
        <div className="whitespace-pre-wrap text-[14px] leading-relaxed text-[#E1E4E8]">
          {displayContent}
          {!isExpanded && isLong && (
            <span 
              className="text-[#8C959F] hover:text-[#70B5F9] cursor-pointer ml-1 font-medium"
              onClick={() => setIsExpanded(true)}
            >
              see more
            </span>
          )}
        </div>
      </div>

      {/* Stats (Faked) */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#38434F] mx-4 text-xs text-[#8C959F]">
        <div className="flex items-center gap-1">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#1485BD] text-[10px]">👍</span>
          <span className="flex h-4 w-4 -ml-1 items-center justify-center rounded-full bg-[#1B896B] text-[10px]">👏</span>
          <span className="ml-1">You and 312 others</span>
        </div>
        <span>42 comments • 18 reposts</span>
      </div>

      {/* Action Bar */}
      <div className="flex px-2 py-1">
        <div className="flex flex-1 items-center justify-center gap-2 py-3 hover:bg-[#2D333B] rounded-md cursor-pointer text-[#8C959F] transition-colors">
          <ThumbsUp className="h-5 w-5" />
          <span className="text-sm font-semibold">Like</span>
        </div>
        <div className="flex flex-1 items-center justify-center gap-2 py-3 hover:bg-[#2D333B] rounded-md cursor-pointer text-[#8C959F] transition-colors">
          <MessageSquare className="h-5 w-5" />
          <span className="text-sm font-semibold">Comment</span>
        </div>
        <div className="flex flex-1 items-center justify-center gap-2 py-3 hover:bg-[#2D333B] rounded-md cursor-pointer text-[#8C959F] transition-colors">
          <Repeat2 className="h-5 w-5" />
          <span className="text-sm font-semibold">Repost</span>
        </div>
        <div className="flex flex-1 items-center justify-center gap-2 py-3 hover:bg-[#2D333B] rounded-md cursor-pointer text-[#8C959F] transition-colors">
          <Send className="h-5 w-5" />
          <span className="text-sm font-semibold">Send</span>
        </div>
      </div>
    </div>
  );
}
