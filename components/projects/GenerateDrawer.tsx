"use client";

import { useState, useCallback, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Project, ViralHook, ContentPiece } from "@/lib/types";
import { type ContentCardPlatform } from "@/components/content/ContentCard";
import { platformLabels, platformOrder } from "./types";
import { fromCardPlatform } from "./utils";

const drawerSlide = {
  initial: { x: "100%" },
  animate: { x: 0 },
  exit: { x: "100%" },
  transition: { type: "spring" as const, bounce: 0, duration: 0.4 },
};

export function GenerateDrawer({
  project,
  selectedHook,
  onClose,
  onGenerated,
}: {
  project: Project;
  selectedHook?: ViralHook;
  onClose: () => void;
  onGenerated: (contents: ContentPiece[]) => void;
}) {
  const [platforms, setPlatforms] = useState<ContentCardPlatform[]>(["twitter", "linkedin"]);
  const [contentTypes, setContentTypes] = useState(["Tweet", "LinkedIn post"]);
  const [tone, setTone] = useState("casual");
  const [wordCount, setWordCount] = useState(160);
  const [stream, setStream] = useState("");
  const [generating, setGenerating] = useState(false);

  const togglePlatform = useCallback((platform: ContentCardPlatform) => {
    setPlatforms((current) =>
      current.includes(platform)
        ? current.filter((item) => item !== platform)
        : [...current, platform],
    );
  }, []);

  const toggleContentType = useCallback((type: string) => {
    setContentTypes((current) =>
      current.includes(type)
        ? current.filter((item) => item !== type)
        : [...current, type],
    );
  }, []);

  async function generate() {
    if (platforms.length === 0 || contentTypes.length === 0) return;
    setGenerating(true);
    setStream("");
    const text = `Generating ${contentTypes.join(", ")} for ${platforms.map((item) => platformLabels[item]).join(", ")} from ${selectedHook?.text ?? project.title}.`;
    for (const token of text.split(/(\s+)/).filter(Boolean)) {
      setStream((current) => `${current}${token}`);
      await new Promise((resolve) => window.setTimeout(resolve, 28));
    }
    const cards = createGeneratedCards(project, selectedHook, platforms, contentTypes, tone, wordCount);
    onGenerated(cards);
    setGenerating(false);
  }

  return (
    <motion.aside
      {...drawerSlide}
      className="fixed bottom-0 right-0 top-[var(--topbar-height)] z-30 w-full border-l bg-card shadow-soft sm:w-[420px]"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <p className="text-sm font-medium">Generate more</p>
            <p className="text-xs text-muted-foreground">
              {selectedHook ? "Using selected hook" : "Using full source"}
            </p>
          </div>
          <Button size="sm" variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          <ControlGroup title="Platforms">
            {platformOrder.map((platform) => (
              <TogglePill
                key={platform}
                active={platforms.includes(platform)}
                label={platformLabels[platform]}
                onClick={() => togglePlatform(platform)}
              />
            ))}
          </ControlGroup>

          <ControlGroup title="Content types">
            {["Tweet", "Thread", "LinkedIn post", "Reel script", "Caption", "Shorts script"].map((type) => (
              <TogglePill
                key={type}
                active={contentTypes.includes(type)}
                label={type}
                onClick={() => toggleContentType(type)}
              />
            ))}
          </ControlGroup>

          <div>
            <p className="mb-3 text-sm font-medium">Tone</p>
            <div className="grid gap-2">
              {[
                ["professional", "Crisp, credible, decision-ready."],
                ["casual", "Human, direct, low-friction."],
                ["educational", "Structured, useful, tactical."],
                ["entertaining", "Punchy, visual, high-energy."],
              ].map(([value, sample]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTone(value)}
                  className={cn(
                    "rounded-[12px] border p-3 text-left transition hover:bg-muted",
                    tone === value && "border-primary bg-primary/10",
                  )}
                >
                  <p className="text-sm font-medium capitalize">{value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{sample}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium">Word count</span>
              <span className="text-muted-foreground">{wordCount}</span>
            </div>
            <input
              className="w-full accent-violet-600"
              min={60}
              max={500}
              value={wordCount}
              onChange={(event) => setWordCount(Number(event.target.value))}
              type="range"
            />
          </div>

          <Button className="w-full bg-[var(--violet)] text-white hover:bg-[var(--violet-dark)]" disabled={generating} onClick={generate}>
            <Sparkles className="h-4 w-4" />
            {generating ? "Generating" : "Generate"}
          </Button>

          <div className="min-h-32 rounded-[12px] border bg-muted/30 p-4 text-sm leading-6 text-muted-foreground">
            {stream || "Live generated output will stream here."}
            {generating ? <span className="ml-1 inline-block h-4 w-[2px] animate-pulse bg-primary align-middle" /> : null}
          </div>
        </div>
      </div>
    </motion.aside>
  );
}

function ControlGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-3 text-sm font-medium">{title}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function TogglePill({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground",
        active && "border-[var(--violet)] bg-[var(--violet)] text-white hover:text-white",
      )}
    >
      {active ? <Check className="mr-1 inline h-3 w-3" /> : null}
      {label}
    </button>
  );
}

function createGeneratedCards(
  project: Project,
  selectedHook: ViralHook | undefined,
  platforms: ContentCardPlatform[],
  contentTypes: string[],
  tone: string,
  wordCount: number,
): ContentPiece[] {
  const stamp = Date.now().toString(36);
  const hookText = selectedHook?.text ?? project.summary.hooks[0] ?? project.title;
  const maxWords = Math.max(30, wordCount);
  const cards: ContentPiece[] = [];

  platforms.forEach((platform, platformIndex) => {
    contentTypes.forEach((contentType, typeIndex) => {
      const platformName = platformLabels[platform];
      const body = buildGeneratedBody(project.title, hookText, platformName, contentType, maxWords);
      cards.push({
        id: `${project.id}-${platform}-${stamp}-${platformIndex}-${typeIndex}`,
        projectId: project.id,
        hookId: selectedHook?.id,
        platform: fromCardPlatform(platform),
        contentType,
        body,
        originalBody: body,
        tone,
        approved: false,
        order: platformIndex * 10 + typeIndex,
        createdAt: new Date().toISOString(),
      });
    });
  });

  return cards;
}

function buildGeneratedBody(
  title: string,
  hook: string,
  platform: string,
  contentType: string,
  wordCount: number,
) {
  const base = `${hook}\n\nUse "${title}" as the proof source. This ${contentType.toLowerCase()} should feel native to ${platform}: specific opening, one useful insight, and a clear next action.`;
  if (platform === "Twitter/X") {
    return `${hook}\n\nOne long-form source becomes useful when the best idea gets translated, not copied. Pull the tension, make one promise, then ship it in the format the platform expects.`;
  }
  if (platform === "YouTube Shorts") {
    return `Hook: ${hook}\n\nScene 1: Show the source title.\nScene 2: Name the mistake most viewers make.\nScene 3: Give the quick fix in three beats.\nCTA: Subscribe for the full breakdown.`;
  }
  return base.split(/\s+/).slice(0, wordCount).join(" ");
}
