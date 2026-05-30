"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { readApiJson } from "@/lib/client-api";
import { cn } from "@/lib/utils";
import type { ContentPiece, Project, ViralHook } from "@/lib/types";

type FlowPhase = "idle" | "analyzing" | "hooks_ready" | "generating" | "complete";
type LocalPlatform = "twitter" | "linkedin" | "instagram" | "youtube";
type LocalTone = "professional" | "casual" | "educational" | "entertaining";

const steps = ["Fetching content", "Transcribing audio", "Extracting viral hooks"] as const;
const platforms: Array<{ id: LocalPlatform; label: string }> = [
  { id: "twitter", label: "Twitter" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "instagram", label: "Instagram" },
  { id: "youtube", label: "YouTube" },
];
const tones: Array<{ id: LocalTone; label: string }> = [
  { id: "professional", label: "Professional" },
  { id: "casual", label: "Casual" },
  { id: "educational", label: "Educational" },
  { id: "entertaining", label: "Entertaining" },
];

export function IngestFlow() {
  const [phase, setPhase] = useState<FlowPhase>("idle");
  const [url, setUrl] = useState("");
  const [rawText, setRawText] = useState("");
  const [activeStep, setActiveStep] = useState(0);
  const [project, setProject] = useState<Project | null>(null);
  const [selectedHookIds, setSelectedHookIds] = useState<string[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<LocalPlatform[]>(["twitter", "linkedin", "instagram", "youtube"]);
  const [tone, setTone] = useState<LocalTone>("casual");
  const [streamedCards, setStreamedCards] = useState<ContentPiece[]>([]);
  const hooks = project?.hooks ?? [];
  const progress = useMemo(() => ((activeStep + 1) / steps.length) * 100, [activeStep]);

  async function analyze(nextUrl = url) {
    const source = nextUrl.trim();
    if (!source && rawText.trim().length < 40) {
      toast.error("Paste a URL or at least 40 characters of source text");
      return;
    }

    setPhase("analyzing");
    setProject(null);
    setStreamedCards([]);
    for (let index = 0; index < steps.length; index += 1) {
      setActiveStep(index);
      await delay([650, 900, 550][index] ?? 600);
    }

    const response = await fetch(source ? "/api/ingest/url" : "/api/ingest/text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: source ? JSON.stringify({ url: source }) : JSON.stringify({ title: "Pasted source", text: rawText }),
    });
    let data: { project?: Project; projectId?: string; error?: string; warning?: string };
    try {
      data = await readApiJson(response);
    } catch (error) {
      if (error instanceof Error && error.message === "credit_exhausted") return;
      toast.error(error instanceof Error ? error.message : "Could not analyze source");
      setPhase("idle");
      return;
    }

    if (!data.project) {
      toast.error(data.error ?? "Could not analyze source");
      setPhase("idle");
      return;
    }

    setProject(data.project);
    const topHooks = [...(data.project.hooks ?? [])]
      .sort((a, b) => b.reachScore - a.reachScore)
      .slice(0, 2)
      .map((hook) => hook.id);
    setSelectedHookIds(topHooks);
    setPhase("hooks_ready");
    if (data.warning) toast.info(data.warning);
  }

  async function generate() {
    if (!project) return;
    setPhase("generating");
    setStreamedCards([]);
    const selected = (project.contents ?? []).filter((content) => {
      const platform = localPlatform(content.platform);
      const platformMatch = selectedPlatforms.includes(platform);
      const hookMatch = selectedHookIds.length === 0 || (content.hookId ? selectedHookIds.includes(content.hookId) : true);
      return platformMatch && hookMatch;
    });
    const cards = selected.length ? selected : project.contents ?? [];

    for (const card of cards.slice(0, 15)) {
      setStreamedCards((current) => [...current, { ...card, tone }]);
      await delay(120);
    }
    setPhase("complete");
    toast.success(`${cards.slice(0, 15).length} pieces ready`, {
      action: {
        label: "View project",
        onClick: () => {
          window.location.href = `/projects/${project.id}`;
        },
      },
    });
  }

  return (
    <section className="rounded-2xl border bg-card p-5" id="source-ingest">
      <div className={cn("transition-opacity", phase !== "idle" && "opacity-75")}>
        <div className="flex flex-col gap-3 md:flex-row">
          <input
            aria-label="Source URL"
            className="h-11 flex-1 rounded-lg border bg-background px-3 text-sm outline-none focus:border-[var(--violet)] focus:ring-2 focus:ring-[var(--violet)]"
            disabled={phase === "analyzing" || phase === "generating"}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="Paste a YouTube URL, podcast link, or blog URL"
            value={url}
          />
          <Button className="h-11" disabled={phase === "analyzing" || phase === "generating"} onClick={() => void analyze()}>
            Analyze
          </Button>
        </div>
        <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          or paste raw text below
          <span className="h-px flex-1 bg-border" />
        </div>
        <textarea
          aria-label="Raw source text"
          className="min-h-28 w-full resize-y rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-[var(--violet)] focus:ring-2 focus:ring-[var(--violet)]"
          disabled={phase === "analyzing" || phase === "generating"}
          onChange={(event) => setRawText(event.target.value)}
          placeholder="Paste transcript, notes, or article text..."
          value={rawText}
        />

      </div>

      {phase === "analyzing" ? (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="mt-5 rounded-xl border bg-muted/30 p-4"
          initial={{ opacity: 0, y: -8 }}
        >
          <div className="h-[3px] overflow-hidden rounded-full bg-border">
            <motion.div
              animate={{ width: `${progress}%` }}
              className="h-full rounded-full bg-[var(--violet)]"
              transition={{ duration: 0.35, ease: [0.16, 1, 0.32, 1] }}
            />
          </div>
          <div className="mt-4 space-y-3">
            {steps.map((step, index) => (
              <div className="flex items-center gap-3 text-sm" key={step}>
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full border",
                    index < activeStep && "border-green-500 bg-green-500 text-white",
                    index === activeStep && "border-[var(--violet)] text-[var(--violet)] animate-pulse",
                  )}
                >
                  {index < activeStep ? <Check className="h-3.5 w-3.5" /> : index + 1}
                </span>
                <span className={index <= activeStep ? "text-foreground" : "text-muted-foreground"}>{step}</span>
              </div>
            ))}
          </div>
        </motion.div>
      ) : null}

      {phase === "hooks_ready" || phase === "complete" || phase === "generating" ? (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="mt-5 rounded-xl border bg-background p-4"
          initial={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.24, ease: [0.16, 1, 0.32, 1] }}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[var(--violet)]" />
            <p className="text-sm font-medium">{hooks.length} viral hooks found</p>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {hooks.slice(0, 5).map((hook) => (
              <HookOption
                hook={hook}
                key={hook.id}
                selected={selectedHookIds.includes(hook.id)}
                onToggle={() =>
                  setSelectedHookIds((current) =>
                    current.includes(hook.id)
                      ? current.filter((id) => id !== hook.id)
                      : [...current, hook.id],
                  )
                }
              />
            ))}
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <ControlPills
              items={platforms}
              selected={selectedPlatforms}
              title="Platforms"
              onToggle={(platform) =>
                setSelectedPlatforms((current) =>
                  current.includes(platform)
                    ? current.filter((item) => item !== platform)
                    : [...current, platform],
                )
              }
            />
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Tone</p>
              <div className="flex flex-wrap gap-2">
                {tones.map((item) => (
                  <button
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium text-muted-foreground transition",
                      tone === item.id && "border-[var(--violet)] bg-[var(--violet)] text-white",
                    )}
                    key={item.id}
                    onClick={() => setTone(item.id)}
                    type="button"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <Button
            className={cn("mt-5 w-full", phase === "hooks_ready" && "animate-pulse")}
            disabled={phase === "generating"}
            onClick={() => void generate()}
          >
            Generate content
            <ArrowRight className="h-4 w-4" />
          </Button>
        </motion.div>
      ) : null}

      {streamedCards.length > 0 ? (
        <div className="mt-5 space-y-3">
          {streamedCards.map((card, index) => (
            <motion.article
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border bg-background p-4"
              initial={{ opacity: 0, y: 16 }}
              key={card.id}
              transition={{ delay: Math.min(index, 8) * 0.06, duration: 0.24, ease: [0.16, 1, 0.32, 1] }}
            >
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[var(--violet)]" />
                <span className="text-xs font-medium">{card.contentType}</span>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{card.body}</p>
            </motion.article>
          ))}
          {project ? (
            <Button asChild className="w-full" variant="secondary">
              <Link href={`/projects/${project.id}`}>Open full project workspace</Link>
            </Button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function HookOption({
  hook,
  selected,
  onToggle,
}: {
  hook: ViralHook;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      className={cn(
        "rounded-xl border p-3 text-left transition hover:bg-muted",
        selected && "border-[var(--violet)] bg-[var(--violet-light)]/40",
      )}
      onClick={onToggle}
      type="button"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="rounded-full bg-[var(--violet-light)] px-2 py-0.5 text-[11px] font-medium text-[var(--violet)]">
          {hook.hookType}
        </span>
        <span className="text-xs text-muted-foreground">{Math.round(hook.reachScore)}</span>
      </div>
      <p className="mt-3 line-clamp-2 text-sm font-medium">{hook.text}</p>
      <div className="mt-3 h-[3px] overflow-hidden rounded-full bg-border">
        <div className="h-full rounded-full bg-[var(--violet)]" style={{ width: `${Math.round(hook.reachScore)}%` }} />
      </div>
    </button>
  );
}

function ControlPills({
  items,
  selected,
  title,
  onToggle,
}: {
  items: Array<{ id: LocalPlatform; label: string }>;
  selected: LocalPlatform[];
  title: string;
  onToggle: (item: LocalPlatform) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium text-muted-foreground">{title}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <button
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium text-muted-foreground transition",
              selected.includes(item.id) && "border-[var(--violet)] bg-[var(--violet)] text-white",
            )}
            key={item.id}
            onClick={() => onToggle(item.id)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function localPlatform(platform: ContentPiece["platform"]): LocalPlatform {
  if (platform === "TWITTER") return "twitter";
  if (platform === "LINKEDIN") return "linkedin";
  if (platform === "INSTAGRAM" || platform === "CAROUSEL" || platform === "STORY") return "instagram";
  return "youtube";
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
