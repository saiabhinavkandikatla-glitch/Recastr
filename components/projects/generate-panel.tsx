"use client";

import type React from "react";
import { useState } from "react";
import { Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StreamingText } from "@/components/ui/streaming-text";
import { ToneSelector } from "@/components/ui/tone-selector";
import { emitCreditExhausted } from "@/lib/client-api";
import { cn } from "@/lib/utils";
import type { Platform, Project } from "@/lib/types";

const platformOptions: Platform[] = [
  "TWITTER",
  "LINKEDIN",
  "INSTAGRAM",
  "FACEBOOK",
  "THREADS",
  "COMMUNITY",
];
const contentTypeOptions = ["Tweet", "Thread", "LinkedIn post", "Reel script", "Caption"];

export function GeneratePanel({ project }: { project: Project }) {
  const [platforms, setPlatforms] = useState<Platform[]>(["TWITTER", "LINKEDIN"]);
  const [contentTypes, setContentTypes] = useState(["Tweet", "LinkedIn post"]);
  const [tone, setTone] = useState("casual");
  const [wordCount, setWordCount] = useState(160);
  const [stream, setStream] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  async function generate() {
    const isRegen = hasGenerated;
    setHasGenerated(true);
    setIsGenerating(true);
    setStream("");
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: project.id,
        platforms,
        contentTypes,
        tone,
        isRegeneration: isRegen,
      }),
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as {
        code?: string;
        credits?: number;
        upgradeUrl?: string;
        error?: string;
      };
      if (response.status === 403 && payload.code === "credit_exhausted") {
        emitCreditExhausted(payload);
      } else {
        toast.error(payload.error ?? "Generation failed");
      }
      setIsGenerating(false);
      return;
    }
    if (!response.body) {
      toast.error("Generation stream unavailable");
      setIsGenerating(false);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      chunk
        .split("\n\n")
        .filter(Boolean)
        .forEach((line) => {
          const payload = line.replace(/^data:\s*/, "");
          if (payload === "[DONE]") return;
          try {
            const parsed = JSON.parse(payload) as { token?: string };
            if (parsed.token) setStream((current) => current + parsed.token);
          } catch {
            setStream((current) => current + payload);
          }
        });
    }
    setIsGenerating(false);
    toast.success("Generation complete");
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
      <Card>
        <CardHeader className="border-b">
          <CardTitle>Generation controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <ControlGroup title="Platforms">
            {platformOptions.map((platform) => (
              <ToggleButton
                key={platform}
                active={platforms.includes(platform)}
                label={platform.toLowerCase()}
                onClick={() =>
                  setPlatforms((current) =>
                    current.includes(platform)
                      ? current.filter((item) => item !== platform)
                      : [...current, platform],
                  )
                }
              />
            ))}
          </ControlGroup>
          <ControlGroup title="Content types">
            {contentTypeOptions.map((type) => (
              <ToggleButton
                key={type}
                active={contentTypes.includes(type)}
                label={type}
                onClick={() =>
                  setContentTypes((current) =>
                    current.includes(type) ? current.filter((item) => item !== type) : [...current, type],
                  )
                }
              />
            ))}
          </ControlGroup>
          <div>
            <p className="mb-3 text-sm font-medium">Tone</p>
            <ToneSelector value={tone} onChange={setTone} />
          </div>
          <div>
            <div className="mb-2 flex justify-between text-sm">
              <span>Word count target</span>
              <span>{wordCount}</span>
            </div>
            <input
              className="w-full accent-violet-600"
              max={500}
              min={60}
              onChange={(event) => setWordCount(Number(event.target.value))}
              type="range"
              value={wordCount}
            />
          </div>
          <Button className="w-full" onClick={generate} disabled={isGenerating || platforms.length === 0}>
            <Sparkles className="h-4 w-4" />
            {isGenerating ? "Generating..." : "Regenerate"}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <StreamingText text={stream || "Streaming output will appear here token by token."} />
        {stream ? (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setStream("")}>
              <Trash2 className="h-4 w-4" />
              Clear preview
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ControlGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-3 text-sm font-medium">{title}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function ToggleButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      className={cn("rounded-full border px-3 py-1.5 text-sm capitalize", active && "border-primary bg-primary/10 text-primary")}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}
