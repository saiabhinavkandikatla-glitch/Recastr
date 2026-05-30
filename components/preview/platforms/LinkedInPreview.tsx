"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import {
  BadgeCheck,
  BriefcaseBusiness,
  ImageIcon,
  MessageSquare,
  MoreHorizontal,
  Repeat2,
  Send,
  ThumbsUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PreviewContent, PreviewDevice } from "@/lib/preview-content";

export function LinkedInPreview({
  content,
  dark,
  device,
}: {
  content: PreviewContent;
  dark: boolean;
  device: PreviewDevice;
}) {
  const [expanded, setExpanded] = useState(false);
  const desktop = device === "desktop";
  const companyMode = /company|team|agency|brand/i.test(content.primaryText);
  const postText = expanded ? content.primaryText : clamp(content.primaryText, desktop ? 620 : 360);
  const showSeeMore = !expanded && content.primaryText.length > postText.length;
  const carouselSlides = useMemo(
    () => (content.carouselSlides.length ? content.carouselSlides : buildLinkedInSlides(content)),
    [content],
  );

  return (
    <div
      className={cn(
        "h-full overflow-y-auto font-sans",
        dark ? "bg-[#0f1419] text-[#f4f2ee]" : "bg-[#f4f2ee] text-[#191919]",
      )}
    >
      <div className={cn("mx-auto", desktop ? "max-w-[555px] py-8" : "px-2 pb-5 pt-10")}>
        <article
          className={cn(
            "overflow-hidden border shadow-sm",
            desktop ? "rounded-lg" : "rounded-none border-x-0",
            dark ? "border-[#38434f] bg-[#1d2226]" : "border-[#dfdeda] bg-white",
          )}
        >
          <header className="flex gap-2 px-3 pt-3">
            <LinkedInAvatar company={companyMode} />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="truncate text-[14px] font-semibold leading-[18px]">
                      {companyMode ? "Recastr" : "Maya from Recastr"}
                    </p>
                    {companyMode ? <BadgeCheck className="h-3.5 w-3.5 fill-[#0a66c2] text-white" /> : null}
                    <span className="text-[12px] text-[#666666]">- 1st</span>
                  </div>
                  <p className="truncate text-[12px] leading-[16px] text-[#666666] dark:text-[#b0b6bd]">
                    {companyMode
                      ? "AI content repurposing platform - 12,842 followers"
                      : "Creator workflow strategist - helping founders ship smarter content"}
                  </p>
                  <p className="flex items-center gap-1 text-[12px] leading-[16px] text-[#666666] dark:text-[#b0b6bd]">
                    2h
                    <span>-</span>
                    <BriefcaseBusiness className="h-3 w-3" />
                  </p>
                </div>
                <button aria-label="More LinkedIn post actions" className="rounded-full p-1 text-[#666666] hover:bg-black/5 dark:hover:bg-white/10" type="button">
                  <MoreHorizontal className="h-5 w-5" />
                </button>
              </div>
            </div>
          </header>

          <div className="px-3 pb-2 pt-3">
            <p className="whitespace-pre-wrap text-[14px] leading-[20px]">
              {postText}
              {showSeeMore ? (
                <button className="ml-1 font-medium text-[#666666] hover:text-[#0a66c2]" onClick={() => setExpanded(true)} type="button">
                  ...see more
                </button>
              ) : null}
            </p>
          </div>

          {content.mediaType === "poll" && content.pollOptions.length ? (
            <LinkedInPoll question={content.pollQuestion} options={content.pollOptions} />
          ) : (
            <LinkedInCarousel slides={carouselSlides} dark={dark} />
          )}

          <div className="px-3">
            <div className="flex items-center justify-between gap-3 border-b border-[#e8e8e8] py-2 text-[12px] text-[#666666] dark:border-[#38434f] dark:text-[#b0b6bd]">
              <div className="flex min-w-0 items-center gap-1">
                <span className="flex -space-x-1">
                  <span className="grid h-4 w-4 place-items-center rounded-full bg-[#0a66c2] text-[9px] text-white">L</span>
                  <span className="grid h-4 w-4 place-items-center rounded-full bg-[#df704d] text-[9px] text-white">C</span>
                  <span className="grid h-4 w-4 place-items-center rounded-full bg-[#2f9e44] text-[9px] text-white">I</span>
                </span>
                <span className="truncate">{desktop ? "2,418 reactions" : "2,418"}</span>
              </div>
              <span className="shrink-0 text-right">{desktop ? "146 comments - 38 reposts" : "146 comments"}</span>
            </div>
            <div className="grid grid-cols-4 py-1.5 text-[12px] font-semibold text-[#666666] dark:text-[#b0b6bd]">
              <LinkedInAction icon={<ThumbsUp className="h-4 w-4" />} label="Like" />
              <LinkedInAction icon={<MessageSquare className="h-4 w-4" />} label="Comment" />
              <LinkedInAction icon={<Repeat2 className="h-4 w-4" />} label="Repost" />
              <LinkedInAction icon={<Send className="h-4 w-4" />} label="Send" />
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}

function LinkedInAvatar({ company }: { company: boolean }) {
  return (
    <div
      className={cn(
        "grid h-12 w-12 shrink-0 place-items-center overflow-hidden border border-black/5 bg-[#0a66c2] text-white",
        company ? "rounded-md" : "rounded-full",
      )}
    >
      <span className="text-[17px] font-semibold">R</span>
    </div>
  );
}

function LinkedInCarousel({ slides, dark }: { slides: string[]; dark: boolean }) {
  const visibleSlides = slides.slice(0, 3);
  const primarySlide = slides[0] ?? "Turn one source into native posts";
  return (
    <div className="border-y border-[#e8e8e8] dark:border-[#38434f]">
      <div className="bg-black/5 p-1 dark:bg-white/5">
        <div className="grid min-h-[174px] grid-cols-[minmax(0,1fr)_96px] gap-1">
          <div className={cn("flex min-w-0 flex-col justify-between overflow-hidden rounded-sm p-3", dark ? "bg-[#243447]" : "bg-[#eaf3ff]")}>
            <div className="inline-flex w-max max-w-full items-center gap-1 rounded-full bg-black/45 px-2 py-1 text-[10px] font-semibold text-white">
              <ImageIcon className="h-3 w-3 shrink-0" />
              <span className="truncate">Carousel</span>
            </div>
            <p className={cn("line-clamp-4 max-w-full break-words text-[20px] font-semibold leading-[1.12]", dark ? "text-white" : "text-[#0a2540]")}>
              {primarySlide}
            </p>
          </div>
          <div className="grid min-w-0 grid-rows-2 gap-1">
            {visibleSlides.slice(1).map((slide, index) => (
              <div
                key={`${slide}-${index}`}
                className={cn(
                  "min-h-0 overflow-hidden rounded-sm p-2 text-[11px] font-semibold leading-tight",
                  dark ? "bg-[#2f3a44] text-slate-100" : "bg-white text-[#191919]",
                )}
              >
                <p className="line-clamp-5 break-words">{slide}</p>
              </div>
            ))}
            {visibleSlides.length < 3 ? (
              <div className={cn("min-h-0 rounded-sm p-2", dark ? "bg-[#2f3a44]" : "bg-white")} />
            ) : null}
          </div>
        </div>
        <div className="flex items-center justify-center gap-1 py-1.5">
          {visibleSlides.map((slide, index) => (
            <span
              aria-label={`Slide ${index + 1}: ${slide}`}
              className={cn("h-1.5 rounded-full transition-all", index === 0 ? "w-4 bg-[#0a66c2]" : "w-1.5 bg-[#8c8c8c]/60")}
              key={`${slide}-dot-${index}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function LinkedInPoll({ question, options }: { question: string; options: string[] }) {
  return (
    <div className="mx-3 mb-3 rounded-lg border border-[#d6d6d6] p-3 dark:border-[#38434f]">
      {question ? <p className="mb-3 text-[13px] font-semibold">{question}</p> : null}
      <div className="space-y-2">
        {options.slice(0, 4).map((option) => (
          <button key={option} className="h-9 w-full rounded-full border border-[#0a66c2] px-3 text-center text-[13px] font-semibold text-[#0a66c2]" type="button">
            {option}
          </button>
        ))}
      </div>
      <p className="mt-3 text-[12px] text-[#666666]">5,284 votes - 2 days left</p>
    </div>
  );
}

function LinkedInAction({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <button className="flex h-10 items-center justify-center gap-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10" type="button">
      {icon}
      {label}
    </button>
  );
}

function buildLinkedInSlides(content: PreviewContent) {
  return [
    content.hook || "Creator workflow insight",
    "Extract the strongest tension from the source.",
    "Rewrite it in the native rhythm of each platform.",
  ];
}

function clamp(value: string, max: number) {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trim()}...`;
}
