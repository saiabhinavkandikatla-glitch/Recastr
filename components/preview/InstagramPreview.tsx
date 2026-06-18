import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal } from "lucide-react";
import React, { useState } from "react";

export function InstagramPreview({ content }: { content: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const lines = content.split("\n");
  const isLong = lines.length > 2 || content.length > 100;
  
  const displayContent = !isExpanded && isLong
    ? content.substring(0, 100) + "... "
    : content;

  return (
    <div className="mx-auto w-full max-w-[400px] border border-[#262626] bg-black text-white sm:rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 p-[2px]">
            <div className="h-full w-full rounded-full border-2 border-black bg-slate-800" />
          </div>
          <span className="text-sm font-semibold">yourbrand</span>
        </div>
        <MoreHorizontal className="h-5 w-5 text-white" />
      </div>

      {/* Media Placeholder */}
      <div className="aspect-square w-full bg-[#121212] flex items-center justify-center">
        <span className="text-[#383838] font-medium">[ Media Placeholder ]</span>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-4">
          <Heart className="h-6 w-6 hover:text-gray-400 cursor-pointer transition-colors" />
          <MessageCircle className="h-6 w-6 hover:text-gray-400 cursor-pointer transition-colors" />
          <Send className="h-6 w-6 hover:text-gray-400 cursor-pointer transition-colors" />
        </div>
        <Bookmark className="h-6 w-6 hover:text-gray-400 cursor-pointer transition-colors" />
      </div>

      {/* Likes */}
      <div className="px-3 pb-1">
        <span className="text-sm font-semibold">1,245 likes</span>
      </div>

      {/* Caption */}
      <div className="px-3 pb-3 text-sm">
        <span className="font-semibold mr-2">yourbrand</span>
        <span className="whitespace-pre-wrap text-[#F5F5F5]">
          {displayContent}
          {!isExpanded && isLong && (
            <span 
              className="text-[#A8A8A8] cursor-pointer ml-1"
              onClick={() => setIsExpanded(true)}
            >
              more
            </span>
          )}
        </span>
      </div>

      {/* Comments */}
      <div className="px-3 pb-4">
        <span className="text-[13px] text-[#A8A8A8] cursor-pointer">View all 84 comments</span>
        <div className="mt-1 text-[10px] text-[#A8A8A8] uppercase tracking-wide">
          2 hours ago
        </div>
      </div>
    </div>
  );
}
