"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Clipboard,
  Download,
  Flame,
  Gauge,
  ListChecks,
  RefreshCcw,
  Sparkles,
} from "lucide-react";
import { format } from "date-fns";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PlatformPreviewEngine } from "@/components/preview/PlatformPreview";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatOutputForEditing, formatPlatform, wordCount } from "@/lib/utils";
import type { Project, SocialOutput, Tone } from "@/lib/types";

type StudioPlatform = "TWITTER" | "LINKEDIN" | "INSTAGRAM" | "COMMUNITY";

type StudioTab = {
  platform: StudioPlatform;
  label: string;
  accent: string;
};

const studioTabs: StudioTab[] = [
  {
    platform: "TWITTER",
    label: "X Thread",
    accent: "from-sky-400 to-teal-500",
  },
  {
    platform: "LINKEDIN",
    label: "LinkedIn",
    accent: "from-blue-500 to-violet-electric",
  },
  {
    platform: "INSTAGRAM",
    label: "Instagram",
    accent: "from-pink-500 to-violet-electric",
  },
  {
    platform: "COMMUNITY",
    label: "YT Community",
    accent: "from-teal-500 to-cyan-400",
  },
];

const tones: Tone[] = [
  "Professional",
  "Casual",
  "Witty",
  "Bold",
  "Empathetic",
  "Educational",
  "Controversial",
  "Storytelling",
];

export function OutputTabs({
  project,
  onExport,
}: {
  project: Project;
  onExport: (format: "pdf" | "csv" | "json") => void;
}) {
  const [outputs, setOutputs] = useState(project.outputs);
  const [activePlatform, setActivePlatform] = useState<StudioPlatform>("TWITTER");
  const [generatingPlatform, setGeneratingPlatform] = useState<StudioPlatform | null>(null);
  const [previewTheme, setPreviewTheme] = useState<"light" | "dark">("dark");
  const [drafts, setDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      project.outputs.map((output) => [output.id, formatOutputForEditing(output)]),
    ),
  );
  const [toneByPlatform, setToneByPlatform] = useState<Record<StudioPlatform, Tone>>({
    TWITTER: "Bold",
    LINKEDIN: "Professional",
    INSTAGRAM: "Witty",
    COMMUNITY: "Casual",
  });

  const outputByPlatform = useMemo(() => {
    return studioTabs.reduce<Partial<Record<StudioPlatform, SocialOutput>>>(
      (acc, tab) => {
        acc[tab.platform] = outputs.find((output) => output.platform === tab.platform);
        return acc;
      },
      {},
    );
  }, [outputs]);

  const activeTab = studioTabs.find((tab) => tab.platform === activePlatform) ?? studioTabs[0];
  const activeOutput = outputByPlatform[activePlatform];
  const activeDraft = activeOutput ? drafts[activeOutput.id] ?? formatOutputForEditing(activeOutput) : "";
  const activeTone = toneByPlatform[activePlatform];
  const qualityScore = getQualityScore(activeOutput, activePlatform);
  const viralScore = Math.max(
    ...studioTabs.map((tab) => getQualityScore(outputByPlatform[tab.platform], tab.platform)),
  );

  async function copyActiveContent() {
    if (!activeDraft) return;
    await navigator.clipboard.writeText(activeDraft);
    toast.success(`${activeTab.label} copied`);
  }

  async function regenerateActiveContent() {
    setGeneratingPlatform(activePlatform);
    try {
      const response = await fetch(
        `/api/generate?projectId=${encodeURIComponent(project.id)}&platforms=${activePlatform}&tone=${encodeURIComponent(activeTone)}&isRegeneration=true`,
      );

      if (!response.body) throw new Error("stream_unavailable");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const event of events) {
          const dataLine = event.split("\n").find((line) => line.startsWith("data:"));
          if (!dataLine) continue;
          const payload = JSON.parse(dataLine.replace("data:", "").trim()) as {
            done?: boolean;
            error?: string;
            output?: SocialOutput;
          };
          if (payload.error) throw new Error(payload.error);
          if (!payload.done && payload.output) {
            setOutputs((current) => upsertOutput(current, payload.output!));
            setDrafts((current) => ({
              ...current,
              [payload.output!.id]: formatOutputForEditing(payload.output!),
            }));
          }
        }
      }

      toast.success(`${activeTab.label} regenerated`);
    } catch {
      toast.error("Regeneration failed");
    } finally {
      setGeneratingPlatform(null);
    }
  }

  function updateActiveDraft(value: string) {
    if (!activeOutput) return;
    setDrafts((current) => ({ ...current, [activeOutput.id]: value }));
  }

  function updateTone(tone: Tone) {
    setToneByPlatform((current) => ({ ...current, [activePlatform]: tone }));
  }

  function switchPlatform(platform: StudioPlatform) {
    setActivePlatform(platform);
  }

  return (
    <section className="relative overflow-hidden rounded-[32px] bg-gray-950 p-5 text-slate-100 shadow-2xl shadow-slate-950/40">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_8%,rgba(124,58,237,0.28),transparent_34%),radial-gradient(circle_at_86%_14%,rgba(20,184,166,0.18),transparent_30%)]" />
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-violet-electric to-transparent" />

      <div className="relative space-y-6">
        <header className="flex flex-col gap-4 border-b border-white/10 pb-6 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-teal-300">
              Source: {formatPlatform(project.sourceType)}
            </p>
            <h1 className="mt-3 max-w-4xl text-4xl font-medium tracking-normal text-white">
              {project.title}
            </h1>
            <p className="mt-3 text-sm text-slate-400">
              Generated {format(new Date(project.createdAt), "MMM d, yyyy")}
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:w-[360px]">
            <MetricPill icon={Gauge} label="Viral score" value={`${viralScore}`} />
            <Button
              size="lg"
              onClick={() => onExport("pdf")}
              className="h-full bg-violet-electric text-white shadow-lg shadow-violet-950/30 hover:bg-violet-electric/90"
            >
              <Download className="h-4 w-4" />
              Export all
            </Button>
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-2">
          <InsightPanel
            icon={Flame}
            title="Viral Hooks"
            items={project.summary.hooks.slice(0, 5)}
            accent="from-orange-400 to-violet-electric"
          />
          <InsightPanel
            icon={ListChecks}
            title="Key Takeaways"
            items={project.summary.takeaways.slice(0, 5)}
            accent="from-teal-400 to-cyan-500"
          />
        </div>

        <div className="space-y-3">
          <SectionHeader eyebrow="Generated Assets" />
          <div className="grid gap-2 md:grid-cols-4">
            {studioTabs.map((tab) => {
              const active = tab.platform === activePlatform;
              return (
                <button
                  key={tab.platform}
                  type="button"
                  aria-label={tab.label}
                  onClick={() => switchPlatform(tab.platform)}
                  className={cn(
                    "relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-4 text-left text-sm font-medium text-slate-300 transition duration-300 hover:bg-white/[0.08] hover:text-white",
                    active && "bg-navy-950 text-white shadow-xl shadow-black/20",
                  )}
                >
                  <span className={cn("absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r opacity-70", tab.accent, active && "opacity-100")} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activePlatform}
            initial={{ opacity: 0, y: 18, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -12, filter: "blur(8px)" }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="overflow-hidden rounded-[28px] border border-white/10 bg-navy-950/95 shadow-2xl shadow-slate-950/30"
          >
            <div className={cn("h-1 bg-gradient-to-r", activeTab.accent)} />
            <div className="grid gap-6 p-5 xl:grid-cols-[minmax(0,1fr)_390px]">
              <div className="space-y-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <SectionHeader eyebrow="Actual Content" />
                    <h2 className="mt-2 text-2xl font-medium text-white">{activeTab.label}</h2>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-[150px_180px]">
                    <QualityBadge score={qualityScore} />
                    <Select
                      value={activeTone}
                      onChange={(event) => updateTone(event.target.value as Tone)}
                      className="border-white/10 bg-slate-950 text-slate-100"
                      aria-label="Tone selector"
                    >
                      {tones.map((tone) => (
                        <option key={tone}>{tone}</option>
                      ))}
                    </Select>
                  </div>
                </div>

                <Textarea
                  value={activeDraft}
                  onChange={(event) => updateActiveDraft(event.target.value)}
                  className="min-h-[520px] resize-y border-white/10 bg-slate-950/80 p-5 font-mono text-sm leading-7 text-slate-100 shadow-inner shadow-black/20 focus:border-violet-electric focus:ring-violet-electric/25"
                />

                <div className="flex flex-col gap-3 border-t border-white/10 pt-5 lg:flex-row lg:items-center lg:justify-between">
                  <p className="text-sm text-slate-400">
                    {activeDraft.length} chars - {wordCount(activeDraft)} words
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      onClick={copyActiveContent}
                      disabled={!activeDraft}
                      className="border-white/10 bg-white/[0.06] text-slate-100 hover:bg-white/[0.10]"
                    >
                      <Clipboard className="h-4 w-4" />
                      Copy
                    </Button>
                    <Button
                      onClick={regenerateActiveContent}
                      disabled={generatingPlatform === activePlatform}
                      className="bg-teal-500 text-slate-950 hover:bg-teal-400"
                    >
                      {generatingPlatform === activePlatform ? (
                        <Sparkles className="h-4 w-4 animate-pulse" />
                      ) : (
                        <RefreshCcw className="h-4 w-4" />
                      )}
                      Regenerate
                    </Button>
                  </div>
                </div>
              </div>

              <PlatformPreviewEngine
                platform={activePlatform}
                draft={activeDraft}
                theme={previewTheme}
                onThemeChange={setPreviewTheme}
              />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}

function SectionHeader({ eyebrow }: { eyebrow: string }) {
  return (
    <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
      {eyebrow}
    </p>
  );
}

function MetricPill({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Gauge;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Icon className="h-3.5 w-3.5 text-teal-300" />
        {label}
      </div>
      <p className="mt-3 text-2xl font-medium text-white">{value}</p>
    </div>
  );
}

function InsightPanel({
  icon: Icon,
  title,
  items,
  accent,
}: {
  icon: typeof Flame;
  title: string;
  items: string[];
  accent: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.045] p-5">
      <div className={cn("absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r", accent)} />
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-teal-300" />
        <h2 className="text-base font-medium text-white">{title}</h2>
      </div>
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li key={item} className="flex gap-3 text-sm leading-6 text-slate-300">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-400" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function QualityBadge({ score }: { score: number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2">
      <div className="flex items-center justify-between gap-4 text-xs text-slate-400">
        <span>AI quality</span>
        <span className="font-medium text-teal-300">{score}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-electric to-teal-500"
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

function getQualityScore(output: SocialOutput | undefined, platform: StudioPlatform) {
  if (!output) return 0;
  const content = asRecord(output.content);
  if (platform === "TWITTER") {
    const singleTweet = asRecord(content?.singleTweet);
    const hookScore = singleTweet?.hookScore;
    if (typeof hookScore === "number") return Math.min(99, Math.max(70, hookScore * 10));
  }
  const text = formatOutputForEditing(output);
  const baseByPlatform: Record<StudioPlatform, number> = {
    TWITTER: 91,
    LINKEDIN: 88,
    INSTAGRAM: 86,
    COMMUNITY: 84,
  };
  const densityBonus = Math.min(8, Math.floor(wordCount(text) / 80));
  return Math.min(98, baseByPlatform[platform] + densityBonus);
}

function upsertOutput(outputs: SocialOutput[], nextOutput: SocialOutput) {
  const exists = outputs.some((output) => output.id === nextOutput.id);
  if (exists) {
    return outputs.map((output) => (output.id === nextOutput.id ? nextOutput : output));
  }
  return [nextOutput, ...outputs];
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}
