"use client";

import { ChevronLeft, ChevronRight, Heart, MessageCircle, Send, Bookmark } from "lucide-react";
import React, { useState, useRef } from "react";

export function CarouselPreview({ content }: { content: string }) {
  const slides = content.split("---").map(t => t.trim()).filter(Boolean);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -320, behavior: "smooth" });
      setCurrentIndex(Math.max(0, currentIndex - 1));
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 320, behavior: "smooth" });
      setCurrentIndex(Math.min(slides.length - 1, currentIndex + 1));
    }
  };

  return (
    <div className="mx-auto w-full max-w-[600px] border border-[#262626] bg-black text-white sm:rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 p-[2px]">
            <div className="h-full w-full rounded-full border-2 border-black bg-slate-800" />
          </div>
          <span className="text-sm font-semibold">yourbrand</span>
        </div>
        <span className="text-xs font-semibold text-[#A8A8A8] bg-[#262626] px-2 py-1 rounded-full">
          {currentIndex + 1} / {slides.length}
        </span>
      </div>

      {/* Carousel Container */}
      <div className="relative aspect-square w-full bg-[#121212] overflow-hidden group">
        <div 
          ref={scrollRef}
          className="flex h-full w-full snap-x snap-mandatory overflow-x-auto scrollbar-hide"
          onScroll={(e) => {
            const index = Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth);
            setCurrentIndex(index);
          }}
        >
          {slides.map((slide, index) => {
            const lines = slide.split("\n").filter(Boolean);
            const title = lines[0]?.replace(/^Slide \d+\s*(Headline|Title)?\s*[:|-]*\s*/i, "").trim() || "";
            const body = lines.slice(1).join("\n").replace(/^Slide \d+\s*(Body)?\s*[:|-]*\s*/i, "").trim();

            return (
              <div key={index} className="flex h-full min-w-full snap-center flex-col items-center justify-center p-8 text-center border-r border-[#262626] last:border-r-0 bg-gradient-to-br from-[#1A1A1A] to-[#0A0A0A]">
                <h2 className="text-3xl font-bold mb-6 text-white leading-tight">{title}</h2>
                <p className="text-lg text-[#E0E0E0] whitespace-pre-wrap">{body}</p>
                
                {/* Branding Footer */}
                <div className="absolute bottom-6 font-semibold text-[#808080] text-sm tracking-widest uppercase">
                  @yourbrand
                </div>
              </div>
            );
          })}
        </div>

        {/* Navigation Overlays */}
        {currentIndex > 0 && (
          <button 
            onClick={scrollLeft}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100 backdrop-blur-sm"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}
        {currentIndex < slides.length - 1 && (
          <button 
            onClick={scrollRight}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100 backdrop-blur-sm"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-4">
          <Heart className="h-6 w-6 hover:text-gray-400 cursor-pointer transition-colors" />
          <MessageCircle className="h-6 w-6 hover:text-gray-400 cursor-pointer transition-colors" />
          <Send className="h-6 w-6 hover:text-gray-400 cursor-pointer transition-colors" />
        </div>
        {/* Pagination Dots */}
        <div className="flex gap-1.5">
          {slides.map((_, i) => (
            <div 
              key={i} 
              className={`h-1.5 rounded-full transition-all ${i === currentIndex ? "w-1.5 bg-[#0095F6]" : "w-1.5 bg-[#555555]"}`} 
            />
          ))}
        </div>
        <Bookmark className="h-6 w-6 hover:text-gray-400 cursor-pointer transition-colors" />
      </div>

      {/* Caption */}
      <div className="px-3 pb-4 text-sm">
        <span className="font-semibold mr-2">yourbrand</span>
        <span className="text-[#F5F5F5]">Swipe to see the full breakdown 👈</span>
      </div>
    </div>
  );
}
