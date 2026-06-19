import { z } from "zod";
import type { SourceSummary } from "@/lib/types";

export const generationBriefSchema = z.object({
  core_promise: z.string().min(8),
  pain_point: z.string().min(8),
  key_steps: z.array(z.string().min(4)).min(3).max(5),
  hook_angle: z.string().min(8),
  target_audience: z.string().min(4),
  cta: z.string().min(4),
});

export type GenerationBrief = z.infer<typeof generationBriefSchema>;

export const fallbackGenerationBrief: GenerationBrief = {
  core_promise: "One strong source becomes a month of platform-ready posts when you extract the right angles.",
  pain_point: "Creators spend hours rewriting the same idea for every platform.",
  key_steps: [
    "Start with the audience problem.",
    "Use one simple mental model.",
    "Make the next action obvious.",
  ],
  hook_angle: "Most creators do not need more ideas — they need better extraction.",
  target_audience: "Creators and content teams",
  cta: "Save this and try it on your next source.",
};

export function briefFromSummary(summary?: SourceSummary, transcript = ""): GenerationBrief {
  if (!summary) return briefFromTranscript(transcript);
  return {
    core_promise: summary.tldr,
    pain_point: `Struggling to repurpose ${summary.topics[0] ?? "long-form content"} for every platform.`,
    key_steps: summary.takeaways.slice(0, 5),
    hook_angle: summary.hooks[0] ?? summary.tldr,
    target_audience: summary.targetAudience.slice(0, 60),
    cta: "Comment which format you want next.",
  };
}

export function briefFromTranscript(transcript: string): GenerationBrief {
  const lines = transcript
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(
      (line) =>
        line.length > 20 &&
        !line.startsWith("Source URL:") &&
        !line.startsWith("Video description:"),
    );
  const first = lines[0] ?? fallbackGenerationBrief.core_promise;
  return {
    ...fallbackGenerationBrief,
    core_promise: first.slice(0, 240),
    hook_angle: first.slice(0, 160),
    key_steps: lines.slice(1, 4).length >= 3 ? lines.slice(1, 4) : fallbackGenerationBrief.key_steps,
  };
}

export function summaryFromBrief(brief: GenerationBrief): SourceSummary {
  return {
    tldr: brief.core_promise,
    takeaways: pad(brief.key_steps, 5, brief.core_promise),
    hooks: pad(
      [brief.hook_angle, brief.pain_point, brief.cta, ...brief.key_steps],
      10,
      brief.core_promise,
    ),
    detectedTone: "educational",
    topics: ["content repurposing", "social media", "creator workflow"],
    targetAudience: brief.target_audience,
  };
}

function pad(values: string[], length: number, fallback: string) {
  const output = values.filter(Boolean);
  while (output.length < length) output.push(fallback);
  return output.slice(0, length);
}
