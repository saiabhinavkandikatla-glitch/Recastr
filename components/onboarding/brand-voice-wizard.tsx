"use client";

import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, FileUp, Sparkles, Wand2, Mic, Video, PenTool, LayoutTemplate, Briefcase, Zap } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProgressJob } from "@/components/ui/progress-job";
import { Textarea } from "@/components/ui/textarea";
import { readApiJson } from "@/lib/client-api";
import { cn } from "@/lib/utils";

const creatorTypes = [
  { id: "Podcaster", icon: Mic, desc: "Audio-first, conversation-driven." },
  { id: "YouTuber", icon: Video, desc: "Visual hooks, structured narrative." },
  { id: "Blogger", icon: PenTool, desc: "Text-heavy, deep explorations." },
  { id: "Coach", icon: Zap, desc: "Actionable, motivational, clear." },
  { id: "Brand", icon: LayoutTemplate, desc: "Consistent, value-driven, professional." },
  { id: "Agency", icon: Briefcase, desc: "Managing multiple voices/tones." }
];

const platforms = ["Twitter / X", "LinkedIn", "Instagram", "YouTube Shorts"];

const tones = [
  ["Professional", "Polished, specific, credible."],
  ["Casual", "Human, direct, easy to read."],
  ["Educational", "Useful, structured, tactical."],
  ["Entertaining", "Sharp, visual, high-energy."],
];

const stepTitles = [
  "Welcome to Recastr",
  "What kind of creator are you?",
  "Choose platforms and tone",
  "Upload your first content",
  "Ready to generate",
  "Your workspace is ready",
];

export function BrandVoiceWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [creatorType, setCreatorType] = useState("Podcaster");
  const [selectedPlatforms, setSelectedPlatforms] = useState(["Twitter / X", "LinkedIn"]);
  const [tone, setTone] = useState("Casual");
  const [source, setSource] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  async function complete() {
    setGenerating(true);
    toast.info("Generating your first content pack");
    if (source.trim()) {
      const response = await fetch("/api/ingest/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${creatorType} source`,
          text: source,
        }),
      });
      let data: { projectId?: string };
      try {
        data = await readApiJson(response);
      } catch (error) {
        if (error instanceof Error && error.message === "credit_exhausted") {
          setGenerating(false);
          return;
        }
        toast.error(error instanceof Error ? error.message : "Could not analyze source");
        setGenerating(false);
        return;
      }
      if (data.projectId) {
        setJobId(`job-${Date.now()}`);
        setStep(5);
        toast.success("First content pack created");
        window.setTimeout(() => router.push("/dashboard?welcome=1"), 900);
        return;
      }
    }
    setJobId(`job-${Date.now()}`);
    setStep(5);
    toast.success("First content pack created");
    window.setTimeout(() => router.push("/dashboard?welcome=1"), 900);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-12">
      <div className="glass-panel p-6 rounded-[24px] border border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-violet-500/10 to-cyan-500/10 pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <h1 className="text-3xl font-bold font-display tracking-tight flex items-center gap-2">
              <Wand2 className="h-6 w-6 text-primary" />
              Creator Setup
            </h1>
            <p className="mt-1 text-sm text-muted-foreground font-medium">Configure Recastr for your unique workflow.</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest bg-background/50 px-3 py-1 rounded-full border border-white/5">
              Step {Math.min(step + 1, stepTitles.length)} of {stepTitles.length}
            </span>
          </div>
        </div>
        <div className="mt-6 h-2 overflow-hidden rounded-full bg-background/50 border border-white/5 relative z-10">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 relative"
            animate={{ width: `${((step + 1) / stepTitles.length) * 100}%` }}
            transition={{ type: "spring", stiffness: 50 }}
          >
            <div className="absolute inset-0 bg-white/20 w-full animate-shimmer" />
          </motion.div>
        </div>
      </div>

      <div className="glass-card rounded-[32px] border border-white/5 bg-card/40 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2" />

        <div className="border-b border-white/5 bg-muted/10 px-8 py-5 relative z-10">
          <h2 className="text-xl font-bold font-display">{stepTitles[step]}</h2>
        </div>

        <div className="p-8 sm:p-10 relative z-10 min-h-[400px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              {step === 0 && (
                <div className="grid gap-8 lg:grid-cols-[1fr_300px] h-full items-center">
                  <div>
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 text-white shadow-glow mb-6">
                      <Sparkles className="h-8 w-8" />
                    </div>
                    <h3 className="text-4xl font-bold font-display leading-[1.1] tracking-tight">Turn one source into a <span className="text-gradient">content system</span>.</h3>
                    <p className="mt-6 text-base leading-relaxed text-muted-foreground font-medium max-w-lg">
                      In the next few steps, Recastr will learn your creator type, preferred platforms, tone, and analyze your first piece of content.
                    </p>
                  </div>
                  <div className="rounded-[20px] border border-white/5 bg-background/50 p-6 text-sm leading-relaxed text-muted-foreground glass-panel">
                    <p className="font-semibold text-foreground mb-2">How it works</p>
                    You can start with a transcript, a blog draft, or a rough idea. If you skip uploading your own source, we&apos;ll start you off with a blank workspace.
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {creatorTypes.map((item) => {
                    const active = creatorType === item.id;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        className={cn(
                          "rounded-[20px] border p-6 text-left transition-all relative overflow-hidden group",
                          active
                            ? "border-primary bg-primary/10 shadow-lg scale-[1.02]"
                            : "border-white/5 bg-card/40 hover:border-white/20 hover:bg-card/60"
                        )}
                        onClick={() => setCreatorType(item.id)}
                        type="button"
                      >
                        {active && <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />}
                        <div className={cn(
                          "h-10 w-10 rounded-[12px] flex items-center justify-center mb-4 transition-colors",
                          active ? "bg-primary text-white shadow-glow" : "bg-muted/50 text-muted-foreground group-hover:text-foreground"
                        )}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <p className="font-bold text-lg relative z-10">{item.id}</p>
                        <p className="mt-2 text-xs text-muted-foreground font-medium relative z-10">{item.desc}</p>
                        {active && (
                          <div className="absolute top-4 right-4 h-6 w-6 rounded-full bg-primary flex items-center justify-center text-white">
                            <Check className="h-3 w-3" />
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}

              {step === 2 && (
                <div className="space-y-10">
                  <div>
                    <p className="mb-4 text-sm font-bold uppercase tracking-wider text-muted-foreground">Target Platforms</p>
                    <div className="flex flex-wrap gap-3">
                      {platforms.map((item) => {
                        const active = selectedPlatforms.includes(item);
                        return (
                          <button
                            key={item}
                            className={cn(
                              "rounded-xl border px-5 py-3 text-sm font-bold transition-all flex items-center gap-2",
                              active
                                ? "border-primary bg-primary text-white shadow-glow scale-105"
                                : "border-white/10 bg-card/50 text-muted-foreground hover:bg-card hover:text-foreground"
                            )}
                            onClick={() =>
                              setSelectedPlatforms((current) =>
                                active ? current.filter((platform) => platform !== item) : [...current, item],
                              )
                            }
                            type="button"
                          >
                            {active && <Check className="h-4 w-4" />}
                            {item}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <p className="mb-4 text-sm font-bold uppercase tracking-wider text-muted-foreground">Brand Tone</p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {tones.map(([name, sample]) => {
                        const active = tone === name;
                        return (
                          <button
                            key={name}
                            className={cn(
                              "rounded-[20px] border p-5 text-left transition-all relative",
                              active
                                ? "border-primary bg-primary/10 shadow-md"
                                : "border-white/5 bg-card/40 hover:border-white/20 hover:bg-card/60"
                            )}
                            onClick={() => setTone(name)}
                            type="button"
                          >
                            <div className="flex items-center justify-between">
                              <p className="font-bold text-lg">{name}</p>
                              {active && <div className="h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.8)]" />}
                            </div>
                            <p className="mt-2 text-sm text-muted-foreground font-medium">{sample}</p>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
                  <div className="space-y-4">
                    <Input
                      placeholder="Paste a YouTube/blog URL (optional)"
                      className="h-12 rounded-xl bg-muted/30 border-white/10 focus-visible:ring-primary/50 text-base"
                    />
                    <Textarea
                      className="min-h-[240px] rounded-2xl bg-muted/30 border-white/10 focus-visible:ring-primary/50 text-base resize-none p-5"
                      placeholder="Or paste raw text/transcript here to generate content..."
                      value={source}
                      onChange={(event) => setSource(event.target.value)}
                    />
                  </div>
                  <div className="rounded-[24px] border border-dashed border-white/20 bg-background/30 p-8 text-center flex flex-col items-center justify-center">
                    <div className="h-14 w-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
                      <FileUp className="h-6 w-6" />
                    </div>
                    <p className="text-sm font-medium text-foreground">Upload Files</p>
                    <p className="mt-2 text-xs text-muted-foreground leading-relaxed">Drop audio or transcript files here in the full upload flow.</p>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="rounded-[24px] border border-white/5 bg-background/50 p-8 glass-panel relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500 to-cyan-500" />
                  <div className="flex items-center gap-3 mb-6">
                    <Sparkles className="h-6 w-6 text-primary" />
                    <h3 className="text-2xl font-bold font-display">Ready to generate</h3>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3 mb-8">
                    <SummaryPill label="Creator Type" value={creatorType} />
                    <SummaryPill label="Brand Tone" value={tone} />
                    <SummaryPill label="Platforms" value={`${selectedPlatforms.length} selected`} />
                  </div>

                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex gap-4 items-start">
                    <Zap className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <p className="text-sm leading-relaxed font-medium text-foreground">
                      Recastr will extract the strongest hooks from your source, generate platform-native content according to your choices, and set up your workspace.
                    </p>
                  </div>
                </div>
              )}

              {step === 5 && (
                <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                    className="flex h-24 w-24 items-center justify-center rounded-full bg-green-500/20 text-green-500 shadow-[0_0_40px_rgba(34,197,94,0.3)] mb-6"
                  >
                    <Check className="h-12 w-12" />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <h2 className="text-3xl font-bold font-display tracking-tight">Your workspace is ready</h2>
                    <p className="mt-3 max-w-md mx-auto text-base text-muted-foreground font-medium">
                      Redirecting you to the dashboard. You can edit, schedule, or export your new content.
                    </p>
                  </motion.div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="bg-muted/10 border-t border-white/5 p-6 sm:px-10 flex items-center justify-between relative z-10">
          <Button
            variant="outline"
            className="rounded-xl border-white/10 hover:bg-card"
            disabled={step === 0 || step === 5 || generating}
            onClick={() => setStep((current) => Math.max(0, current - 1))}
          >
            Back
          </Button>

          {step < 4 ? (
            <Button
              className="rounded-xl bg-foreground text-background hover:bg-foreground/90 font-bold px-6"
              onClick={() => setStep((current) => current + 1)}
            >
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : step === 4 ? (
            <Button
              className="rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 text-white hover:opacity-90 font-bold px-8 shadow-glow"
              disabled={generating}
              onClick={complete}
            >
              Generate Workspace
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button disabled className="rounded-xl bg-primary/50 text-white px-8">
              Opening dashboard...
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      {jobId ? <ProgressJob jobId={jobId} /> : null}
    </div>
  );
}

function SummaryPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[16px] border border-white/5 bg-card/50 p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
      <p className="text-base font-bold text-foreground">{value}</p>
    </div>
  );
}
