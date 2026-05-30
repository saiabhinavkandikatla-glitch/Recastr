"use client";

import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Sparkles, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContentCard, type ContentCardPlatform } from "@/components/content/ContentCard";
import { cn } from "@/lib/utils";
import type { ContentPiece } from "@/lib/types";
import { platformLabels } from "./types";
import { toCardPlatform, formatContentType, platformDot } from "./utils";

export type FeedItem =
  | { kind: "label"; id: string; platform: ContentCardPlatform }
  | { kind: "content"; id: string; content: ContentPiece };

export function ContentFeed({
  feedItems,
  scheduledDates,
  selectedContentId,
  onApprove,
  onToneChange,
  onBodyChange,
  onSchedule,
  onCopy,
  onRegenerate,
  onActivate,
  onGenerateMore,
}: {
  feedItems: FeedItem[];
  scheduledDates: Record<string, Date>;
  selectedContentId: string | null;
  onApprove: (id: string) => void;
  onToneChange: (id: string, tone: string) => void;
  onBodyChange: (id: string, body: string) => void;
  onSchedule: (id: string, date: Date) => void;
  onCopy: (id: string) => void;
  onRegenerate: (id: string) => void;
  onActivate: (id: string) => void;
  onGenerateMore: () => void;
}) {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const contentCount = feedItems.filter((item) => item.kind === "content").length;
  const virtualizer = useVirtualizer({
    count: feedItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => (feedItems[index]?.kind === "label" ? 42 : 245),
    overscan: 5,
  });

  if (contentCount === 0) {
    return (
      <div className="rounded-[16px] border border-dashed bg-card/60 p-10 text-center">
        <Sparkles className="mx-auto h-8 w-8 text-primary" />
        <h3 className="mt-4 text-lg font-medium">No cards for this filter yet</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Clear the hook filter or generate more content from the right drawer.
        </p>
        <Button className="mt-5 bg-[var(--violet)] text-white hover:bg-[var(--violet-dark)]" onClick={onGenerateMore}>
          <Plus className="h-4 w-4" />
          Generate more
        </Button>
      </div>
    );
  }

  if (contentCount <= 20) {
    return (
      <div className="space-y-3">
        {feedItems.map((item) =>
          item.kind === "label" ? (
            <PlatformLabel key={item.id} platform={item.platform} />
          ) : (
            <ContentCardAdapter
              key={item.id}
              content={item.content}
              scheduledAt={scheduledDates[item.id]}
              selected={item.id === selectedContentId}
              onApprove={onApprove}
              onToneChange={onToneChange}
              onBodyChange={onBodyChange}
              onSchedule={onSchedule}
              onCopy={onCopy}
              onRegenerate={onRegenerate}
              onActivate={onActivate}
            />
          ),
        )}
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className="h-[calc(100vh-13rem)] overflow-y-auto pr-2"
    >
      <div
        className="relative"
        style={{ height: `${virtualizer.getTotalSize()}px` }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const item = feedItems[virtualItem.index];
          if (!item) return null;
          return (
            <div
              key={item.id}
              className="absolute left-0 top-0 w-full pb-3"
              style={{ transform: `translateY(${virtualItem.start}px)` }}
            >
              {item.kind === "label" ? (
                <PlatformLabel platform={item.platform} />
              ) : (
                <ContentCardAdapter
                  content={item.content}
                  scheduledAt={scheduledDates[item.id]}
                  selected={item.id === selectedContentId}
                  onApprove={onApprove}
                  onToneChange={onToneChange}
                  onBodyChange={onBodyChange}
                  onSchedule={onSchedule}
                  onCopy={onCopy}
                  onRegenerate={onRegenerate}
                  onActivate={onActivate}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ContentCardAdapter({
  content,
  scheduledAt,
  selected,
  onApprove,
  onToneChange,
  onBodyChange,
  onSchedule,
  onCopy,
  onRegenerate,
  onActivate,
}: {
  content: ContentPiece;
  scheduledAt?: Date;
  selected: boolean;
  onApprove: (id: string) => void;
  onToneChange: (id: string, tone: string) => void;
  onBodyChange: (id: string, body: string) => void;
  onSchedule: (id: string, date: Date) => void;
  onCopy: (id: string) => void;
  onRegenerate: (id: string) => void;
  onActivate: (id: string) => void;
}) {
  return (
    <ContentCard
      id={content.id}
      platform={toCardPlatform(content.platform)}
      contentType={formatContentType(content.contentType)}
      body={content.body}
      tone={content.tone}
      approved={content.approved}
      scheduledAt={scheduledAt}
      order={content.order}
      selected={selected}
      onApprove={onApprove}
      onToneChange={onToneChange}
      onBodyChange={onBodyChange}
      onSchedule={onSchedule}
      onCopy={onCopy}
      onRegenerate={onRegenerate}
      onActivate={onActivate}
    />
  );
}

function PlatformLabel({ platform }: { platform: ContentCardPlatform }) {
  return (
    <div className="sticky top-0 z-[5] -mx-1 bg-[var(--page-bg)]/90 px-1 py-2 backdrop-blur">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className={cn("h-2 w-2 rounded-full", platformDot(platform))} />
        <span className="font-medium text-foreground">{platformLabels[platform]}</span>
        <span className="hidden sm:inline">Generated assets</span>
      </div>
    </div>
  );
}
