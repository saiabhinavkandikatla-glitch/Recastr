"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowRight,
  FileAudio,
  FileText,
  Link2,
  NotebookText,
  Sparkles,
  UploadCloud,
  Video,
  X,
} from "lucide-react";
import type { ComponentType } from "react";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProgressStepper, ingestionSteps } from "@/components/ui/progress-stepper";
import { Textarea } from "@/components/ui/textarea";
import { AnimatedBorderCard } from "@/components/ui/animated-border";
import { cn } from "@/lib/utils";
import type { IngestionStep, SourceType } from "@/lib/types";

const ingestFormSchema = z.object({
  sourceType: z.enum(["YOUTUBE", "PODCAST", "BLOG", "TEXT"]),
  url: z.string().optional(),
  title: z.string().optional(),
  text: z.string().optional(),
});

type IngestForm = z.infer<typeof ingestFormSchema>;

const sourceOptions: Array<{
  type: SourceType;
  label: string;
  icon: ComponentType<{ className?: string }>;
}> = [
  { type: "YOUTUBE", label: "YouTube", icon: Video },
  { type: "PODCAST", label: "Podcast", icon: FileAudio },
  { type: "BLOG", label: "Blog", icon: NotebookText },
  { type: "TEXT", label: "Raw text", icon: FileText },
];

export function MultiSourceIngest() {
  const stepperRef = useRef<HTMLDivElement>(null);
  const [activeStep, setActiveStep] = useState<IngestionStep>("Fetching");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [fileName, setFileName] = useState("");
  const [generatedProjectId, setGeneratedProjectId] = useState<string | null>(null);
  const [showTranscriptModal, setShowTranscriptModal] = useState(false);
  const [pendingYoutubeUrl, setPendingYoutubeUrl] = useState<string>("");
  const [manualTranscript, setManualTranscript] = useState("");
  const [lastError, setLastError] = useState<{
    message: string;
    code?: string;
    provider?: string;
    reason?: string;
  } | null>(null);

  const form = useForm<IngestForm>({
    resolver: zodResolver(ingestFormSchema),
    defaultValues: {
      sourceType: "YOUTUBE",
      url: "",
      title: "",
      text: "",
    },
  });

  const sourceType = form.watch("sourceType");

  async function onSubmit(values: IngestForm) {
    setIsProcessing(true);
    setIsComplete(false);
    setGeneratedProjectId(null);
    setLastError(null);
    stepperRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    for (const step of ingestionSteps) {
      setActiveStep(step);
      await new Promise((resolve) => setTimeout(resolve, step === "Ready" ? 250 : 650));
    }

    const route =
      values.sourceType === "YOUTUBE"
        ? "/api/ingest/url"
        : values.sourceType === "BLOG"
          ? "/api/ingest/url"
          : values.sourceType === "PODCAST"
            ? "/api/ingest/podcast"
            : "/api/ingest/text";

    try {
      const response = await fetch(route, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body:
          values.sourceType === "TEXT"
            ? JSON.stringify({ title: values.title, text: values.text })
            : JSON.stringify({ url: values.url }),
      });
      const data = (await response.json()) as {
        projectId?: string;
        error?: string;
        code?: string;
        provider?: string;
        reason?: string;
        warning?: string;
      };

      if (!response.ok || !data.projectId) {
        if (isTranscriptErrorCode(data.code)) {
          setLastError({
            message: data.error ?? "No captions available for this video.",
            code: data.code,
            provider: data.provider,
            reason: data.reason,
          });
          setPendingYoutubeUrl(values.url || "");
          setShowTranscriptModal(true);
          setIsProcessing(false);
          return;
        }
        const message = data.reason ?? data.error ?? "Analyze Source failed.";
        setLastError({
          message,
          code: data.code,
          provider: data.provider,
          reason: data.reason,
        });
        throw new Error(message);
      }

      const projectId = data.projectId;
      setGeneratedProjectId(projectId);
      setIsComplete(true);
      setLastError(null);
      toast.success("Source intelligence is ready", {
        description: data.warning ?? "Open the generated project to edit, copy, and export posts.",
      });
    } catch (error) {
      toast.error("Ingestion failed", {
        description: error instanceof Error ? error.message : "Paste a manual transcript and try again.",
      });
    } finally {
      setIsProcessing(false);
    }
  }

  async function submitWithTranscript() {
    if (!manualTranscript.trim()) {
      toast.error("Transcript is empty", {
        description: "Paste at least 50 words of transcript content.",
      });
      return;
    }

    setIsProcessing(true);
    setShowTranscriptModal(false);

    try {
      const response = await fetch("/api/ingest/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `YouTube: ${pendingYoutubeUrl.split("v=")[1]?.split("&")[0] || "Video"}`,
          text: manualTranscript,
        }),
      });

      const data = (await response.json()) as {
        projectId?: string;
        error?: string;
      };

      if (!response.ok || !data.projectId) {
        throw new Error(data.error ?? "ingestion_failed");
      }

      setGeneratedProjectId(data.projectId);
      setIsComplete(true);
      setLastError(null);
      setManualTranscript("");
      setPendingYoutubeUrl("");

      toast.success("Source ingested with manual transcript", {
        description: "Open the project to generate platform-specific posts.",
      });
    } catch (error) {
      toast.error("Failed to ingest transcript", {
        description: error instanceof Error ? error.message : "Try again.",
      });
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <AnimatedBorderCard>
      <Card id="source-ingest" className="scroll-mt-24 overflow-hidden border-0 shadow-none">
        <CardHeader className="border-b bg-card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Ingest a source</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Paste a URL, upload audio, or drop in raw text to start a project.
            </p>
          </div>
          <div className="flex rounded-[8px] border bg-muted p-1">
            {sourceOptions.map((option) => {
              const Icon = option.icon;
              const selected = sourceType === option.type;
              return (
                <button
                  key={option.type}
                  type="button"
                  onClick={() => form.setValue("sourceType", option.type)}
                  className={cn(
                    "flex h-8 items-center gap-2 rounded-[6px] px-3 text-xs font-medium text-muted-foreground transition",
                    selected && "bg-card text-foreground shadow-sm",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form className="grid gap-5 xl:grid-cols-[1fr_360px]" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-4">
            {sourceType === "PODCAST" ? (
              <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-[12px] border border-dashed border-input bg-muted/40 p-6 text-center transition hover:border-primary">
                <UploadCloud className="h-8 w-8 text-primary" />
                <p className="mt-3 text-sm font-medium">
                  {fileName || "Drop MP3, MP4, or WAV"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Whisper chunking handles long audio and timeout recovery.
                </p>
                <input
                  type="file"
                  accept="audio/*,video/mp4"
                  className="sr-only"
                  onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")}
                />
              </label>
            ) : sourceType === "TEXT" ? (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="title">Project title</Label>
                  <Input
                    id="title"
                    placeholder="Quarterly webinar transcript"
                    {...form.register("title")}
                  />
                </div>
                <div>
                  <Label htmlFor="text">Raw transcript or notes</Label>
                  <Textarea
                    id="text"
                    className="min-h-40 font-mono text-xs"
                    placeholder="Paste source text here..."
                    {...form.register("text")}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <Label htmlFor="url">
                  {sourceType === "YOUTUBE" ? "YouTube URL" : "Blog URL"}
                </Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="url"
                      className="pl-9"
                      placeholder={
                        sourceType === "YOUTUBE"
                          ? "https://youtube.com/watch?v=..."
                          : "https://example.com/post"
                      }
                      {...form.register("url")}
                    />
                  </div>
                  <Button type="submit" disabled={isProcessing}>
                    Analyze
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Paywalls, geo-blocks, and private videos fall back to manual transcript paste.
                </p>
              </div>
            )}

            {sourceType !== "YOUTUBE" && sourceType !== "BLOG" ? (
              <Button type="submit" disabled={isProcessing}>
                Analyze source
              </Button>
            ) : null}
          </div>

          <motion.div
            ref={stepperRef}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[12px] border bg-muted/30 p-4"
          >
            <ProgressStepper
              activeStep={activeStep}
              completed={isComplete}
              processing={isProcessing}
            />
            {generatedProjectId ? (
              <div className="mt-5 rounded-2xl border border-primary/25 bg-primary/10 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="flex items-center gap-2 text-sm font-medium">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Generated content is ready
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Open the project workspace to see tweets, LinkedIn posts, Instagram captions, and community posts.
                    </p>
                  </div>
                  <Button asChild size="sm">
                    <Link href={`/projects/${generatedProjectId}`}>
                      Open generated content
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            ) : null}
            {lastError ? (
              <div className="mt-5 rounded-2xl border border-destructive/30 bg-destructive/10 p-4">
                <p className="text-sm font-medium text-destructive">Analyze Source failed</p>
                <p className="mt-1 text-xs text-muted-foreground">{lastError.message}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                  {lastError.code ? <span>Code: {lastError.code}</span> : null}
                  {lastError.provider ? <span>Provider: {lastError.provider}</span> : null}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  disabled={isProcessing}
                  onClick={form.handleSubmit(onSubmit)}
                >
                  Retry analyze
                </Button>
              </div>
            ) : null}
            <div className="mt-5 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-[8px] border bg-card p-3">
                <p className="font-medium">Cached transcripts</p>
                <p className="mt-1 text-muted-foreground">MD5 keyed, storage-backed</p>
              </div>
              <div className="rounded-[8px] border bg-card p-3">
                <p className="font-medium">SSE generation</p>
                <p className="mt-1 text-muted-foreground">Tokens stream into cards</p>
              </div>
            </div>
          </motion.div>
        </form>
      </CardContent>
      </Card>

      {showTranscriptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-2xl mx-4">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b">
              <CardTitle>No transcript found</CardTitle>
              <button
                onClick={() => setShowTranscriptModal(false)}
                className="rounded-md hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <p className="text-sm text-muted-foreground">
                This YouTube video doesn't have captions or transcript available. Paste the transcript manually to generate content.
              </p>
              <div>
                <Label htmlFor="manual-transcript">Video transcript</Label>
                <Textarea
                  id="manual-transcript"
                  className="min-h-48 font-mono text-xs mt-2"
                  placeholder="Paste the complete video transcript here (at least 50 words)..."
                  value={manualTranscript}
                  onChange={(e) => setManualTranscript(e.target.value)}
                />
              </div>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowTranscriptModal(false);
                    setManualTranscript("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={submitWithTranscript}
                  disabled={isProcessing || !manualTranscript.trim()}
                >
                  Generate from transcript
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </AnimatedBorderCard>
  );
}

function isTranscriptErrorCode(code?: string) {
  return [
    "NO_TRANSCRIPT",
    "NO_CAPTIONS",
    "TRANSCRIPT_DISABLED",
    "PROVIDER_TIMEOUT",
    "TRANSCRIPT_QUOTA_EXCEEDED",
    "TRANSCRIPT_UNAVAILABLE",
    "NETWORK_FAILURE",
  ].includes(code ?? "");
}
