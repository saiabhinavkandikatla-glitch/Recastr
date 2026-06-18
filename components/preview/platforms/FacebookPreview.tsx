"use client";

import type { ReactNode } from "react";
import {
  Earth,
  ExternalLink,
  MessageCircle,
  MoreHorizontal,
  Send,
  Share2,
  ThumbsUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PreviewContent, PreviewDevice } from "@/lib/preview-content";

export function FacebookPreview({
  content,
  dark,
  device,
}: {
  content: PreviewContent;
  dark: boolean;
  device: PreviewDevice;
}) {
  const desktop = device === "desktop";
  const hasPoll = content.pollOptions.length > 1;
  const hasLink = /https?:\/\/|www\.|link|download|guide/i.test(content.primaryText);

  return (
    <div className={cn("h-full overflow-y-auto font-sans", dark ? "bg-[#18191a] text-[#e4e6eb]" : "bg-[#f0f2f5] text-[#050505]")}>
      <div className={cn("mx-auto", desktop ? "max-w-[590px] py-8" : "px-2 py-4")}>
        <article className={cn("overflow-hidden shadow-sm", desktop ? "rounded-lg" : "rounded-lg", dark ? "bg-[#242526]" : "bg-white")}>
          <header className="flex items-center gap-2 p-3">
            <FacebookAvatar />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <p className="truncate text-[15px] font-semibold">Recastr Studio</p>
                <span className="rounded-full bg-[#1877f2] px-1 text-[9px] font-bold text-white">f</span>
              </div>
              <p className="flex items-center gap-1 text-[12px] text-[#65676b] dark:text-[#b0b3b8]">
                2h
                <span aria-hidden="true">&middot;</span>
                <Earth className="h-3 w-3" />
              </p>
            </div>
            <button aria-label="More Facebook post actions" className="rounded-full p-2 text-[#65676b] hover:bg-black/5 dark:text-[#b0b3b8] dark:hover:bg-white/10" type="button">
              <MoreHorizontal className="h-5 w-5" />
            </button>
          </header>

          <div className="px-3 pb-3">
            <p className="whitespace-pre-wrap text-[15px] leading-5">{content.primaryText}</p>
            {content.hashtags.length ? <p className="mt-2 text-[14px] text-[#1877f2]">{content.hashtags.join(" ")}</p> : null}
          </div>

          {hasPoll ? (
            <FacebookPoll question={content.pollQuestion} options={content.pollOptions} dark={dark} />
          ) : hasLink ? (
            <FacebookLinkCard content={content} dark={dark} />
          ) : (
            <FacebookMedia content={content} dark={dark} />
          )}

          <div className="px-3">
            <div className="flex items-center justify-between border-b border-[#ced0d4] py-2 text-[13px] text-[#65676b] dark:border-[#3e4042] dark:text-[#b0b3b8]">
              <span className="flex items-center gap-1">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-[#1877f2] text-[10px] text-white">
                  <ThumbsUp className="h-3 w-3 fill-white" />
                </span>
                1.9K
              </span>
              <span>286 comments - 74 shares</span>
            </div>
            <div className="grid grid-cols-3 py-1 text-[14px] font-semibold text-[#65676b] dark:text-[#b0b3b8]">
              <FacebookAction icon={<ThumbsUp className="h-[18px] w-[18px]" />} label="Like" />
              <FacebookAction icon={<MessageCircle className="h-[18px] w-[18px]" />} label="Comment" />
              <FacebookAction icon={desktop ? <Share2 className="h-[18px] w-[18px]" /> : <Send className="h-[18px] w-[18px]" />} label="Share" />
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}

function FacebookAvatar() {
  return (
    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#1877f2] text-[16px] font-bold text-white">
      R
    </div>
  );
}

function FacebookMedia({ content, dark }: { content: PreviewContent; dark: boolean }) {
  return (
    <div className={cn("grid aspect-[16/10] place-items-center border-y p-6 text-center", dark ? "border-[#3e4042] bg-[#111827]" : "border-[#ced0d4] bg-[#e7f3ff]")}>
      <div className={cn("rounded-2xl border p-5", dark ? "border-[#3e4042] bg-[#242526]" : "border-[#dadde1] bg-white")}>
        <p className="text-[24px] font-bold leading-tight">{content.hook || "Repurpose one source into every channel"}</p>
        <p className="mt-3 text-[13px] text-[#65676b] dark:text-[#b0b3b8]">Image post preview</p>
      </div>
    </div>
  );
}

function FacebookLinkCard({ content, dark }: { content: PreviewContent; dark: boolean }) {
  return (
    <div className={cn("border-y", dark ? "border-[#3e4042] bg-[#18191a]" : "border-[#ced0d4] bg-[#f0f2f5]")}>
      <div className={cn("aspect-[1.95] p-5", dark ? "bg-[#111827]" : "bg-[#dfe7f2]")}>
        <div className="grid h-full place-items-center rounded-lg border border-white/30 bg-black/10 text-white">
          <ExternalLink className="h-10 w-10" />
        </div>
      </div>
      <div className={cn("p-3", dark ? "bg-[#3a3b3c]" : "bg-[#f0f2f5]")}>
        <p className="text-[12px] uppercase text-[#65676b] dark:text-[#b0b3b8]">recastr.app</p>
        <p className="mt-1 text-[16px] font-semibold leading-5">{content.hook || "Turn one source into 30 content assets"}</p>
        <p className="mt-1 line-clamp-2 text-[13px] text-[#65676b] dark:text-[#b0b3b8]">{content.primaryText}</p>
      </div>
    </div>
  );
}

function FacebookPoll({ question, options, dark }: { question: string; options: string[]; dark: boolean }) {
  return (
    <div className="px-3 pb-3">
      {question ? <p className="mb-2 text-[14px] font-semibold">{question}</p> : null}
      <div className="space-y-2">
        {options.slice(0, 4).map((option, index) => (
          <button key={option} className={cn("relative h-10 w-full overflow-hidden rounded-lg border px-3 text-left text-[14px] font-semibold", dark ? "border-[#3e4042]" : "border-[#ced0d4]")} type="button">
            <span className="absolute inset-y-0 left-0 bg-[#1877f2]/15" style={{ width: `${[48, 28, 15, 9][index] ?? 12}%` }} />
            <span className="relative flex items-center justify-between">
              <span>{option}</span>
              <span>{[48, 28, 15, 9][index] ?? 12}%</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function FacebookAction({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <button className="flex h-10 items-center justify-center gap-2 rounded-md hover:bg-black/5 dark:hover:bg-white/10" type="button">
      {icon}
      {label}
    </button>
  );
}
