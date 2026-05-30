"use client";

import { Clipboard, Circle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PlatformBadge } from "@/components/ui/platform-badge";
import { cn } from "@/lib/utils";
import type { ContentPiece } from "@/lib/types";

export function ContentCard({
  content,
  active,
  onClick,
}: {
  content: ContentPiece;
  active?: boolean;
  onClick?: () => void;
}) {
  async function copyContent() {
    await navigator.clipboard.writeText(content.body);
    toast.success("Copied");
  }

  return (
    <Card
      className={cn(
        "cursor-pointer border-white/10 bg-card/80 shadow-none transition hover:-translate-y-0.5 hover:shadow-soft",
        active && "ring-2 ring-primary",
      )}
      onClick={onClick}
    >
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <PlatformBadge platform={content.platform} />
            <p className="text-sm font-medium">{content.contentType}</p>
          </div>
          <Circle className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="line-clamp-4 text-sm leading-6 text-muted-foreground">{content.body}</p>
        <div className="flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
          <span>{content.body.length} chars</span>
          <Button
            aria-label="Copy content"
            size="sm"
            variant="ghost"
            onClick={(event) => {
              event.stopPropagation();
              void copyContent();
            }}
          >
            <Clipboard className="h-3.5 w-3.5" />
            Copy
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
