import { Heart, MessageCircle, Repeat, Send } from "lucide-react";
import React from "react";

export function ThreadsPreview({ content }: { content: string }) {
  const threads = content.split("---").map(t => t.trim()).filter(Boolean);

  return (
    <div className="mx-auto w-full max-w-[500px] rounded-[32px] border border-[#333638] bg-[#101010] text-[#F3F5F7] p-2">
      {threads.map((thread, index) => (
        <div key={index} className="relative flex gap-3 p-4">
          
          {/* Avatar & Thread Line */}
          <div className="flex flex-col items-center">
            <div className="h-9 w-9 shrink-0 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500" />
            {index !== threads.length - 1 && (
              <div className="mt-2 w-[2px] grow bg-[#333638] rounded-full" />
            )}
          </div>

          {/* Thread Content */}
          <div className="flex w-full flex-col min-w-0 pb-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[15px] hover:underline cursor-pointer">yourbrand</span>
              <span className="text-[#777777] text-sm">2h</span>
            </div>
            
            <div className="mt-0.5 whitespace-pre-wrap text-[15px] leading-[1.4] text-[#F3F5F7] break-words">
              {thread}
            </div>

            {/* Action Bar */}
            <div className="mt-3 flex items-center gap-4 text-[#F3F5F7]">
              <div className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[#1E1E1E] cursor-pointer transition-colors -ml-2">
                <Heart className="h-[18px] w-[18px]" />
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[#1E1E1E] cursor-pointer transition-colors -ml-1">
                <MessageCircle className="h-[18px] w-[18px]" />
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[#1E1E1E] cursor-pointer transition-colors -ml-1">
                <Repeat className="h-[18px] w-[18px]" />
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[#1E1E1E] cursor-pointer transition-colors -ml-1">
                <Send className="h-[18px] w-[18px]" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
