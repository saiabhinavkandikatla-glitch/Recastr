"use client";

import { motion } from "framer-motion";
import {
  CheckCircle2,
  Clipboard,
  Diff,
  RefreshCcw,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { readApiJson } from "@/lib/client-api";
import { useRecastrStore } from "@/lib/store";
import { cn, formatOutputForEditing, formatPlatform, wordCount } from "@/lib/utils";
import type { Platform, SocialOutput, Tone } from "@/lib/types";

const platformLimit: Partial<Record<string, number>> = {
  TWITTER: 280,
  LINKEDIN: 3000,
  INSTAGRAM: 2200,
};

const platformAccent: Record<Platform, { bar: string; ring: string; badge: string }> = {
  TWITTER: {
    bar: "from-sky-400 via-cyan-400 to-blue-500",
    ring: "ring-sky-400/70",
    badge: "bg-sky-500/10 text-sky-700 ring-sky-500/20 dark:text-sky-300",
  },
  LINKEDIN: {
    bar: "from-blue-600 via-cyan-500 to-violet-500",
    ring: "ring-blue-500/70",
    badge: "bg-blue-700/10 text-blue-700 ring-blue-700/20 dark:text-blue-300",
  },
  INSTAGRAM: {
    bar: "from-pink-500 via-rose-500 to-amber-400",
    ring: "ring-pink-500/70",
    badge: "bg-pink-500/10 text-pink-700 ring-pink-500/20 dark:text-pink-300",
  },
  FACEBOOK: {
    bar: "from-blue-600 via-sky-500 to-cyan-400",
    ring: "ring-blue-500/70",
    badge: "bg-blue-600/10 text-blue-700 ring-blue-600/20 dark:text-blue-300",
  },
  THREADS: {
    bar: "from-zinc-950 via-zinc-500 to-zinc-300",
    ring: "ring-zinc-500/70",
    badge: "bg-zinc-950/10 text-zinc-800 ring-zinc-700/20 dark:text-zinc-100",
  },
  YOUTUBE: {
    bar: "from-red-500 via-rose-500 to-orange-400",
    ring: "ring-red-500/70",
    badge: "bg-red-500/10 text-red-700 ring-red-500/20 dark:text-red-300",
  },
  CAROUSEL: {
    bar: "from-amber-400 via-orange-500 to-rose-500",
    ring: "ring-amber-500/70",
    badge: "bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-300",
  },
  COMMUNITY: {
    bar: "from-emerald-400 via-cyan-500 to-sky-500",
    ring: "ring-emerald-500/70",
    badge: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300",
  },
  STORY: {
    bar: "from-emerald-400 via-teal-500 to-cyan-500",
    ring: "ring-emerald-500/70",
    badge: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300",
  },
};

export function OutputCard({
  output,
  active,
  onSelect,
}: {
  output: SocialOutput;
  active: boolean;
  onSelect: (output: SocialOutput) => void;
}) {
  const [draft, setDraft] = useState(formatOutputForEditing(output));
  const [isRewriting, setIsRewriting] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const selectedTone = useRecastrStore((state) => state.selectedTone);
  const approveOutput = useRecastrStore((state) => state.approveOutput);
  const approvedIds = useRecastrStore((state) => state.approvedOutputIds);
  const original = formatOutputForEditing({
    ...output,
    content: output.originalContent ?? output.content,
  });
  const changed = draft !== original;
  const limit = platformLimit[output.platform];
  const isOverLimit = Boolean(limit && draft.length > limit);
  const approved = output.approved || approvedIds.includes(output.id);
  const accent = platformAccent[output.platform];

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobile(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const diffPreview = useMemo(() => {
    if (!changed) return null;
    const originalWords = new Set(original.split(/\s+/));
    return draft
      .split(/(\s+)/)
      .map((word, index) =>
        word.trim() && !originalWords.has(word) ? (
          <mark key={`${word}-${index}`} className="rounded bg-primary/15 text-foreground">
            {word}
          </mark>
        ) : (
          <span key={`${word}-${index}`}>{word}</span>
        ),
      );
  }, [changed, draft, original]);

  async function copy() {
    await navigator.clipboard.writeText(draft);
    toast.success("Copied to clipboard");
  }

  async function rewrite(tone: Tone) {
    setIsRewriting(true);
    try {
      const response = await fetch("/api/tone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: draft,
          fromTone: output.tone,
          toTone: tone,
          blend: 80,
        }),
      });
      const data = await readApiJson<{ content?: string }>(response);
      setDraft(data.content ?? draft);
      toast.success(`Rewritten in a ${tone.toLowerCase()} tone`);
    } catch (error) {
      if (error instanceof Error && error.message === "credit_exhausted") return;
      toast.error("Tone rewrite failed");
    } finally {
      setIsRewriting(false);
    }
  }

  return (
    <Card
      className={cn(
        "relative cursor-pointer overflow-hidden shadow-none transition duration-300 hover:-translate-y-0.5 hover:shadow-soft",
        active && `ring-2 ${accent.ring}`,
      )}
      onClick={() => onSelect({ ...output, content: draft })}
    >
      <div className={`absolute inset-y-0 left-0 w-1 bg-gradient-to-b ${accent.bar}`} />
      <CardHeader className="border-b bg-muted/25 pl-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-sm">{output.outputType}</CardTitle>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge className={accent.badge} variant="muted">
                {formatPlatform(output.platform)}
              </Badge>
              <Badge variant={approved ? "success" : "muted"}>
                {approved ? "approved" : "draft"}
              </Badge>
              {changed ? (
                <Badge>
                  <Diff className="mr-1 h-3 w-3" />
                  edited
                </Badge>
              ) : null}
            </div>
          </div>
          {!isMobile ? (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Regenerate section"
              onClick={(event) => {
                event.stopPropagation();
                rewrite(selectedTone);
              }}
              disabled={isRewriting}
            >
              {isRewriting ? (
                <Sparkles className="h-4 w-4 animate-pulse" />
              ) : (
                <RefreshCcw className="h-4 w-4" />
              )}
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pl-6">
        <motion.div key={draft.slice(0, 24)} initial={{ opacity: 0.6 }} animate={{ opacity: 1 }}>
          <Textarea
            value={draft}
            readOnly={isMobile}
            onChange={(event) => setDraft(event.target.value)}
            className={cn(
              "min-h-44 border-slate-200/80 bg-slate-50/70 font-mono text-xs leading-6 shadow-inner dark:bg-slate-950/50",
              isMobile && "cursor-default",
              isOverLimit && "border-red-500 focus:border-red-500",
            )}
          />
        </motion.div>

        {changed ? (
          <div className="rounded-[8px] border bg-muted/40 p-3 text-xs leading-5">
            {diffPreview}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span>{draft.length} chars</span>
            <span>{wordCount(draft)} words</span>
            {limit ? (
              <span className={cn(isOverLimit && "text-red-600")}>
                limit {limit}
              </span>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={copy}>
              <Clipboard className="h-3.5 w-3.5" />
              Copy
            </Button>
            {!isMobile ? (
              <Button
                size="sm"
                onClick={(event) => {
                  event.stopPropagation();
                  approveOutput(output.id);
                  toast.success("Moved to schedule queue");
                }}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Looks good
              </Button>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
