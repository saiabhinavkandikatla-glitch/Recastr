import { Heart, MessageCircle, Repeat2, Share, BarChart2 } from "lucide-react";
import React from "react";

export function TwitterPreview({ content }: { content: string }) {
  const tweets = content.split("---").map(t => t.replace(/^TWEET \d+:\s*/i, "").trim()).filter(Boolean);

  return (
    <div className="mx-auto w-full max-w-[600px] rounded-xl border border-[#2F3336] bg-[#000000] text-white">
      {tweets.map((tweet, index) => (
        <div key={index} className="relative flex gap-3 p-4 border-b border-[#2F3336] last:border-b-0">
          
          {/* Avatar & Thread Line */}
          <div className="flex flex-col items-center">
            <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-purple-600" />
            {index !== tweets.length - 1 && (
              <div className="mt-2 w-[2px] grow bg-[#333639]" />
            )}
          </div>

          {/* Tweet Content */}
          <div className="flex w-full flex-col min-w-0">
            <div className="flex items-center gap-1.5 text-sm">
              <span className="font-bold text-[#E7E9EA] truncate">Your Brand</span>
              <span className="text-[#71767B] truncate">@yourbrand</span>
              <span className="text-[#71767B]">·</span>
              <span className="text-[#71767B]">Now</span>
            </div>
            
            <div className="mt-1 whitespace-pre-wrap text-[15px] leading-normal text-[#E7E9EA] break-words">
              {tweet}
            </div>

            {/* Action Bar */}
            <div className="mt-3 flex max-w-md items-center justify-between text-[#71767B]">
              <div className="flex items-center gap-2 transition-colors hover:text-[#1D9BF0] cursor-pointer group">
                <div className="rounded-full p-2 group-hover:bg-[#1D9BF0]/10 -ml-2">
                  <MessageCircle className="h-4 w-4" />
                </div>
              </div>
              <div className="flex items-center gap-2 transition-colors hover:text-[#00BA7C] cursor-pointer group">
                <div className="rounded-full p-2 group-hover:bg-[#00BA7C]/10 -ml-2">
                  <Repeat2 className="h-4 w-4" />
                </div>
              </div>
              <div className="flex items-center gap-2 transition-colors hover:text-[#F91880] cursor-pointer group">
                <div className="rounded-full p-2 group-hover:bg-[#F91880]/10 -ml-2">
                  <Heart className="h-4 w-4" />
                </div>
              </div>
              <div className="flex items-center gap-2 transition-colors hover:text-[#1D9BF0] cursor-pointer group">
                <div className="rounded-full p-2 group-hover:bg-[#1D9BF0]/10 -ml-2">
                  <BarChart2 className="h-4 w-4" />
                </div>
              </div>
              <div className="flex items-center gap-2 transition-colors hover:text-[#1D9BF0] cursor-pointer group">
                <div className="rounded-full p-2 group-hover:bg-[#1D9BF0]/10 -ml-2">
                  <Share className="h-4 w-4" />
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
