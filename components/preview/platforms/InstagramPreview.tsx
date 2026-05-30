"use client";

import type { ReactNode } from "react";
import {
  Bookmark,
  Clapperboard,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Music2,
  Send,
  Volume2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PreviewContent, PreviewDevice } from "@/lib/preview-content";

export function InstagramPreview({
  content,
  dark,
  device,
}: {
  content: PreviewContent;
  dark: boolean;
  device: PreviewDevice;
}) {
  const desktop = device === "desktop";
  const reel = content.mediaType === "video" || /hook:|scene|cta:/i.test(content.primaryText);
  const carouselSlides = content.carouselSlides.length ? content.carouselSlides : [content.hook, "Value", "CTA"];

  return (
    <div className={cn("h-full overflow-y-auto font-sans", dark ? "bg-black text-white" : "bg-white text-[#262626]")}>
      <div className={cn("mx-auto", desktop ? "max-w-[470px] py-8" : "pt-8")}>
        <section className={cn("overflow-hidden", desktop && "rounded-xl border border-[#dbdbdb] dark:border-[#262626]")}>
          <header className="flex h-12 items-center justify-between border-b border-[#efefef] px-3 dark:border-[#262626]">
            <div className="flex items-center gap-2">
              <StoryRing />
              <div>
                <p className="text-[13px] font-semibold leading-4">recastr.studio</p>
                <p className="text-[11px] leading-3 text-[#737373]">{reel ? "Original audio" : "Creator workflow"}</p>
              </div>
            </div>
            <MoreHorizontal className="h-5 w-5" />
          </header>

          {reel ? (
            <InstagramReel content={content} dark={dark} />
          ) : (
            <InstagramCarousel slides={carouselSlides} dark={dark} />
          )}

          <div className="px-3 pb-4 pt-3">
            <div className="flex items-center justify-between">
              <div className="flex gap-4">
                <Heart className="h-6 w-6" />
                <MessageCircle className="h-6 w-6" />
                <Send className="h-6 w-6" />
              </div>
              <Bookmark className="h-6 w-6" />
            </div>
            <div className="mt-3 flex justify-center gap-1">
              {carouselSlides.slice(0, 5).map((slide, index) => (
                <span key={`${slide}-${index}`} className={cn("h-1.5 w-1.5 rounded-full", index === 0 ? "bg-[#0095f6]" : "bg-[#a8a8a8]")} />
              ))}
            </div>
            <p className="mt-3 text-[13px] font-semibold">12,842 likes</p>
            <p className="mt-1 whitespace-pre-wrap text-[13px] leading-[18px]">
              <span className="font-semibold">recastr.studio </span>
              {content.primaryText}
            </p>
            {content.hashtags.length ? (
              <p className="mt-1 text-[13px] leading-[18px] text-[#00376b] dark:text-[#e0f1ff]">
                {content.hashtags.join(" ")}
              </p>
            ) : null}
            <p className="mt-2 text-[13px] text-[#737373]">View all 328 comments</p>
            <p className="mt-1 text-[10px] uppercase tracking-wide text-[#737373]">2 hours ago</p>
          </div>
        </section>
      </div>
    </div>
  );
}

function StoryRing() {
  return (
    <div className="rounded-full bg-[conic-gradient(#feda75,#fa7e1e,#d62976,#962fbf,#4f5bd5,#feda75)] p-[2px]">
      <div className="grid h-8 w-8 place-items-center rounded-full bg-white text-[12px] font-bold text-[#262626] dark:bg-black dark:text-white">
        R
      </div>
    </div>
  );
}

function InstagramCarousel({ slides, dark }: { slides: string[]; dark: boolean }) {
  const first = slides[0] || "Turn one podcast into 30 posts";
  const slideCount = Math.max(1, slides.length);
  return (
    <div className={cn("relative grid aspect-square place-items-center overflow-hidden p-6 text-center", dark ? "bg-[#101010]" : "bg-[#f7f7f7]")}>
      <div
        className={cn(
          "flex max-h-full w-full max-w-[84%] flex-col overflow-hidden rounded-3xl border p-5",
          dark ? "border-[#363636] bg-[#1c1c1c]" : "border-[#dbdbdb] bg-white",
        )}
      >
        <p className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#737373]">
          Carousel 1/{slideCount}
        </p>
        <p className="mt-4 line-clamp-6 min-w-0 break-words text-[23px] font-semibold leading-[1.08] tracking-[-0.01em]">
          {first}
        </p>
      </div>
      <div className="absolute right-3 top-3 rounded-full bg-black/55 px-2 py-1 text-[11px] font-semibold text-white">
        1/{slideCount}
      </div>
      <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-1.5">
        {slides.slice(0, 5).map((slide, index) => (
          <span
            aria-label={`Slide ${index + 1}: ${slide}`}
            className={cn("h-1.5 rounded-full transition-all", index === 0 ? "w-4 bg-[#0095f6]" : "w-1.5 bg-[#a8a8a8]/75")}
            key={`${slide}-preview-dot-${index}`}
          />
        ))}
      </div>
    </div>
  );
}

function InstagramReel({ content, dark }: { content: PreviewContent; dark: boolean }) {
  return (
    <div className={cn("relative aspect-[9/14] overflow-hidden", dark ? "bg-[#070707]" : "bg-[#111827] text-white")}>
      <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/35 px-2 py-1 text-[11px] font-semibold text-white">
        <Clapperboard className="h-3 w-3" />
        Reels
      </div>
      <div className="absolute right-3 top-3 rounded-full bg-black/35 p-2 text-white">
        <Volume2 className="h-4 w-4" />
      </div>
      <div className="absolute inset-x-8 top-1/2 max-h-[42%] -translate-y-1/2 overflow-hidden rounded-3xl bg-white/10 p-5 text-center backdrop-blur-sm">
        <p className="line-clamp-4 break-words text-[28px] font-bold leading-[1.05] text-white">
          {content.hook || "Stop wasting long-form content"}
        </p>
      </div>
      <div className="absolute bottom-4 left-3 right-16 text-white">
        <p className="text-[13px] font-semibold">@recastr.studio</p>
        <p className="mt-1 line-clamp-3 text-[12px] leading-[16px]">{content.primaryText}</p>
        <p className="mt-2 flex items-center gap-1 text-[12px]">
          <Music2 className="h-3.5 w-3.5" />
          Original audio - Recastr Studio
        </p>
      </div>
      <div className="absolute bottom-8 right-3 space-y-5 text-center text-white">
        <ReelAction icon={<Heart className="h-6 w-6" />} label="18K" />
        <ReelAction icon={<MessageCircle className="h-6 w-6" />} label="412" />
        <ReelAction icon={<Send className="h-6 w-6" />} label="" />
      </div>
    </div>
  );
}

function ReelAction({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="grid place-items-center gap-1">
      {icon}
      {label ? <span className="text-[11px] font-semibold">{label}</span> : null}
    </div>
  );
}
