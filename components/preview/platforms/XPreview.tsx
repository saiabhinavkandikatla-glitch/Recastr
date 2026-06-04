"use client";

import {
  BarChart3,
  BadgeCheck,
  Bookmark,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Repeat2,
  Share,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PreviewContent, PreviewDevice } from "@/lib/preview-content";

export function XPreview({
  content,
  dark,
  device,
}: {
  content: PreviewContent;
  dark: boolean;
  device: PreviewDevice;
}) {
  const desktop = device === "desktop";
  const thread = normalizeThread(content).slice(0, desktop ? 6 : 4);
  const hasPoll = content.pollOptions.length > 1;
  const quoteText = buildQuoteText(content, thread);

  return (
    <div className={cn("h-full overflow-y-auto font-sans", dark ? "bg-black text-[#e7e9ea]" : "bg-white text-[#0f1419]")}>
      <div className={cn("mx-auto min-h-full border-x", dark ? "border-[#2f3336]" : "border-[#eff3f4]", desktop ? "max-w-[600px]" : "border-x-0")}>
        <header className={cn("sticky top-0 z-10 flex h-[52px] items-center gap-7 border-b px-4 backdrop-blur", dark ? "border-[#2f3336] bg-black/80" : "border-[#eff3f4] bg-white/85")}>
          <span className="text-[20px]">‹</span>
          <div>
            <p className="text-[18px] font-bold leading-5">Post</p>
            <p className="text-[12px] leading-4 text-[#71767b]">{thread.length > 1 ? `${thread.length} posts` : "1 post"}</p>
          </div>
        </header>

        <div className="divide-y divide-[#eff3f4] dark:divide-[#2f3336]">
          {thread.map((tweet, index) => (
            <article key={`${tweet}-${index}`} className="relative flex gap-3 px-4 py-3">
              {index < thread.length - 1 ? <div className={cn("absolute left-[35px] top-[54px] h-[calc(100%-30px)] w-0.5", dark ? "bg-[#2f3336]" : "bg-[#cfd9de]")} /> : null}
              <XAvatar />
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-1">
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-1 text-[15px] leading-5">
                      <span className="truncate font-bold">Recastr</span>
                      <BadgeCheck className="h-4 w-4 shrink-0 fill-[#1d9bf0] text-black dark:text-white" />
                      <span className="truncate text-[#71767b]">@recastr_ai</span>
                      <span className="text-[#71767b]">-</span>
                      <span className="text-[#71767b]">{index === 0 ? "2h" : `${index + 1}m`}</span>
                    </div>
                  </div>
                  <button aria-label="More X post actions" className="rounded-full p-1 text-[#71767b] hover:bg-[#1d9bf0]/10 hover:text-[#1d9bf0]" type="button">
                    <MoreHorizontal className="h-5 w-5" />
                  </button>
                </div>

                <p className="whitespace-pre-wrap text-[15px] leading-5">{tweet}</p>

                {index === 0 && hasPoll ? <XPoll question={content.pollQuestion || content.hook} options={content.pollOptions} /> : null}
                {index === 0 && !hasPoll && quoteText ? <XQuote text={quoteText} dark={dark} /> : null}
                {index === 0 && content.mediaType === "carousel" ? <XMediaGrid slides={content.carouselSlides} dark={dark} /> : null}

                <XActionRow
                  comments=""
                  reposts=""
                  likes=""
                  views=""
                />
              </div>
            </article>
          ))}
        </div>

        {desktop ? (
          <footer className="border-t border-[#eff3f4] px-4 py-3 text-[14px] text-[#71767b] dark:border-[#2f3336]">
            Preview only. Engagement appears after you publish manually.
          </footer>
        ) : null}
      </div>
    </div>
  );
}

function XAvatar() {
  return (
    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#111827] text-[15px] font-bold text-white ring-1 ring-white/10">
      R
    </div>
  );
}

function XActionRow({
  comments,
  reposts,
  likes,
  views,
}: {
  comments: string;
  reposts: string;
  likes: string;
  views: string;
}) {
  const items = [
    { icon: MessageCircle, value: comments, color: "hover:text-[#1d9bf0]" },
    { icon: Repeat2, value: reposts, color: "hover:text-[#00ba7c]" },
    { icon: Heart, value: likes, color: "hover:text-[#f91880]" },
    { icon: BarChart3, value: views, color: "hover:text-[#1d9bf0]" },
    { icon: Bookmark, value: "", color: "hover:text-[#1d9bf0]" },
    { icon: Share, value: "", color: "hover:text-[#1d9bf0]" },
  ];

  return (
    <div className="mt-3 flex max-w-[430px] justify-between text-[#71767b]">
      {items.map(({ icon: Icon, value, color }, index) => (
        <button key={`${value}-${index}`} className={cn("flex items-center gap-1 text-[13px] transition", color)} type="button">
          <Icon className="h-[18px] w-[18px]" />
          {value ? <span>{value}</span> : null}
        </button>
      ))}
    </div>
  );
}

function XPoll({ question, options }: { question: string; options: string[] }) {
  return (
    <div className="mt-3 space-y-2">
      {question ? <p className="text-[14px] font-semibold">{question}</p> : null}
      {options.slice(0, 4).map((option, index) => (
        <div key={option} className="relative overflow-hidden rounded-full border border-[#536471]">
          <div className="absolute inset-y-0 left-0 bg-[#1d9bf0]/20" style={{ width: `${[42, 31, 18, 9][index] ?? 12}%` }} />
          <div className="relative flex h-9 items-center justify-between px-3 text-[14px]">
            <span>{option}</span>
            <span className="font-semibold">{[42, 31, 18, 9][index] ?? 12}%</span>
          </div>
        </div>
      ))}
      <p className="text-[13px] text-[#71767b]">5,804 votes - Final results</p>
    </div>
  );
}

function XQuote({ text, dark }: { text: string; dark: boolean }) {
  return (
    <div className={cn("mt-3 overflow-hidden rounded-2xl border", dark ? "border-[#2f3336]" : "border-[#cfd9de]")}>
      <div className="flex gap-2 p-3">
        <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#7c3aed] text-[10px] font-bold text-white">R</div>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-bold">
            Recastr Studio <span className="font-normal text-[#71767b]">@recastr_ai</span>
          </p>
          <p className="mt-1 line-clamp-3 text-[14px] leading-5">{text}</p>
        </div>
      </div>
    </div>
  );
}

function XMediaGrid({ slides, dark }: { slides: string[]; dark: boolean }) {
  const visible = slides.length ? slides.slice(0, 4) : ["Hook", "Value", "Proof", "CTA"];
  return (
    <div className="mt-3 grid aspect-[1.8] grid-cols-2 overflow-hidden rounded-2xl border border-[#536471]">
      {visible.map((slide, index) => (
        <div key={`${slide}-${index}`} className={cn("grid place-items-center border-[#536471] p-3 text-center text-[12px] font-semibold", index % 2 === 0 && "border-r", index < 2 && "border-b", dark ? "bg-[#16181c]" : "bg-[#eff3f4]")}>
          {slide}
        </div>
      ))}
    </div>
  );
}

function normalizeThread(content: PreviewContent) {
  if (content.thread.length) return content.thread;
  const sentences = content.primaryText.split(/(?<=[.!?])\s+/).filter(Boolean);
  return sentences.length > 1 ? sentences.slice(0, 6) : [content.primaryText];
}

function buildQuoteText(content: PreviewContent, thread: string[]) {
  if (content.mediaType === "poll") return "";
  if (thread.length > 1) return "";
  return content.hook && content.hook !== content.primaryText ? content.hook : "";
}
