import { ThumbsUp, MessageCircle, Share2, MoreHorizontal, Globe } from "lucide-react";
import React from "react";

export function FacebookPreview({ content }: { content: string }) {
  return (
    <div className="mx-auto w-full max-w-[500px] rounded-xl border border-[#3E4042] bg-[#242526] text-[#E4E6EB]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-2">
        <div className="flex gap-2.5">
          <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-tr from-blue-600 to-blue-400" />
          <div className="flex flex-col justify-center">
            <span className="text-[15px] font-semibold text-[#E4E6EB] hover:underline cursor-pointer">
              Your Brand Page
            </span>
            <div className="flex items-center gap-1 text-[13px] text-[#B0B3B8]">
              <span>2 hrs</span>
              <span>·</span>
              <Globe className="h-3 w-3" />
            </div>
          </div>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-[#3A3B3C] cursor-pointer transition-colors">
          <MoreHorizontal className="h-5 w-5 text-[#B0B3B8]" />
        </div>
      </div>

      {/* Body Text */}
      <div className="px-4 pb-3 pt-1">
        <div className="whitespace-pre-wrap text-[15px] leading-normal text-[#E4E6EB]">
          {content}
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#3E4042] text-[15px] text-[#B0B3B8]">
        <div className="flex items-center gap-1.5">
          <div className="flex items-center">
            <div className="z-10 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-blue-500 ring-2 ring-[#242526]">
              <ThumbsUp className="h-2.5 w-2.5 text-white" fill="white" />
            </div>
            <div className="-ml-1 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-red-500 ring-2 ring-[#242526]">
              <HeartIcon />
            </div>
          </div>
          <span>1.2K</span>
        </div>
        <div className="flex gap-3">
          <span className="hover:underline cursor-pointer">142 comments</span>
          <span className="hover:underline cursor-pointer">38 shares</span>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex px-1 py-1">
        <div className="flex flex-1 items-center justify-center gap-2 py-2 hover:bg-[#3A3B3C] rounded-md cursor-pointer text-[#B0B3B8] font-medium transition-colors">
          <ThumbsUp className="h-5 w-5" />
          <span className="text-[15px]">Like</span>
        </div>
        <div className="flex flex-1 items-center justify-center gap-2 py-2 hover:bg-[#3A3B3C] rounded-md cursor-pointer text-[#B0B3B8] font-medium transition-colors">
          <MessageCircle className="h-5 w-5" />
          <span className="text-[15px]">Comment</span>
        </div>
        <div className="flex flex-1 items-center justify-center gap-2 py-2 hover:bg-[#3A3B3C] rounded-md cursor-pointer text-[#B0B3B8] font-medium transition-colors">
          <Share2 className="h-5 w-5" />
          <span className="text-[15px]">Share</span>
        </div>
      </div>
    </div>
  );
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-2.5 w-2.5 text-white" fill="currentColor">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}
