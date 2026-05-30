import { nanoid } from "nanoid";
import { z } from "zod";
import { getOpenAIClient } from "@/lib/openai/client";
import { normalizePlatformCopy } from "@/lib/platform-limits";
import { prisma } from "@/lib/prisma/client";
import { getStoredProject } from "@/lib/projects/store";
import { summarySchema } from "@/lib/ai/schemas";
import { env } from "@/lib/env";
import type { Platform, SocialOutput, SourceSummary, Tone } from "@/lib/types";

const generationSchema = z.record(z.string(), z.unknown());

const fallbackSummary: SourceSummary = {
  tldr: "A source has been analyzed into reusable ideas for platform-native content.",
  takeaways: [
    "Lead with the strongest source promise.",
    "Translate the idea for each platform instead of copying it.",
    "Keep the output specific, concise, and useful.",
  ],
  hooks: [
    "One source can become a complete content system.",
    "The strongest post is usually hiding in the highest-tension moment.",
    "Repurpose the idea, not the exact wording.",
  ],
  detectedTone: "educational",
  topics: ["content repurposing", "creator workflow"],
  targetAudience: "Founders, creators, and content teams",
};

const platformPrompt: Record<Platform, string> = {
  TWITTER:
    "Generate one punchy tweet, one 5 tweet thread, and one debate-starting quote-tweet angle. Keep every tweet under 280 characters.",
  LINKEDIN:
    "Generate one short LinkedIn post under 150 words, one long story-led post under 400 words, and one poll with 4 options.",
  INSTAGRAM:
    "Generate one 30-second Reel script, one caption under 150 words, and 20 relevant hashtags without # symbols.",
  FACEBOOK:
    "Generate one Facebook feed post, one poll with 4 options, and one image caption designed for comments and shares.",
  THREADS:
    "Generate one 5-post Threads sequence with conversational pacing, one standalone post, and one reply-bait question.",
  YOUTUBE:
    "Generate one YouTube community post, one Shorts script, and three title ideas with clear viewer transformations.",
  CAROUSEL:
    "Generate a 7-slide carousel with headline, two-line body, and visual suggestion per slide.",
  COMMUNITY:
    "Generate one platform-native community post, one poll with 4 options, and one visual prompt that invites comments.",
  STORY:
    "Generate a 5-slide story sequence with text and visual direction per slide.",
};

export async function summarizeTranscript(transcript: string): Promise<SourceSummary> {
  if (!env.openaiKey) return fallbackSummary;

  const openai = getOpenAIClient();
  if (!openai) return fallbackSummary;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    temperature: 0.35,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are an expert content analyst. Return only valid JSON with tldr, takeaways, hooks, detectedTone, topics, and targetAudience.",
      },
      {
        role: "user",
        content: `Transcript:\n${truncateWords(transcript, 6000)}\n\nReturn: tldr string, exactly 5 takeaways, exactly 10 hooks, detectedTone as educational/motivational/controversial/storytelling/news, 3-5 topics, targetAudience.`,
      },
    ],
  });

  const content = response.choices[0]?.message.content;
  if (!content) return fallbackSummary;
  return summarySchema.parse(JSON.parse(content));
}

export async function generatePlatformOutputs({
  projectId,
  platforms,
  tone,
}: {
  projectId: string;
  platforms: Platform[];
  tone: Tone | string;
}): Promise<SocialOutput[]> {
  if (!env.openaiKey) {
    const storedProject = getStoredProject(projectId);
    const storedOutputs = storedProject?.outputs ?? [];
    if (storedOutputs.length > 0) {
      return storedOutputs
        .filter((output) => platforms.includes(output.platform))
        .map((output) => ({
          ...output,
          content: normalizeGeneratedContent(output.platform, output.content),
          tone,
          createdAt: new Date().toISOString(),
        }));
    }
    return platforms.map((platform) => createFallbackOutput(projectId, platform, tone));
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { summary: true },
  });
  const summary = project?.summary ? summarySchema.parse(project.summary) : getStoredProject(projectId)?.summary ?? fallbackSummary;
  const generated = await Promise.all(
    platforms.map((platform) => generatePlatformOutput(projectId, platform, tone, summary)),
  );
  return generated;
}

async function generatePlatformOutput(
  projectId: string,
  platform: Platform,
  tone: Tone | string,
  summary: SourceSummary,
): Promise<SocialOutput> {
  const openai = getOpenAIClient();
  if (!openai) {
    return createFallbackOutput(projectId, platform, tone);
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    temperature: 0.75,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are a world-class creator strategist. Write human, specific, platform-native content. Avoid filler, hype, and generic AI phrasing. Return only valid JSON.",
      },
      {
        role: "user",
        content: `Source intelligence: ${JSON.stringify(summary)}\nTone: ${tone}\nPlatform: ${platform}\nTask: ${platformPrompt[platform]}`,
      },
    ],
  });
  const raw = response.choices[0]?.message.content ?? "{}";
  const content = normalizeGeneratedContent(platform, generationSchema.parse(JSON.parse(raw)));

  return {
    id: `output-${nanoid(10)}`,
    projectId,
    platform,
    outputType: `${platform.toLowerCase()} pack`,
    tone,
    content,
    originalContent: content,
    approved: false,
    createdAt: new Date().toISOString(),
  };
}

function createFallbackOutput(
  projectId: string,
  platform: Platform,
  tone: Tone | string,
): SocialOutput {
  const content = normalizeGeneratedContent(platform, {
    content:
      "Lead with the strongest source promise, keep the copy specific, and adapt the structure so it feels native to the platform.",
    hook_score: 8,
    estimated_engagement: "Strong fit for educational creator audiences",
    platform_tips: ["Open with tension", "Make one clear point", "Use a platform-native CTA"],
  });

  return {
    id: `output-${platform.toLowerCase()}-${nanoid(10)}`,
    projectId,
    platform,
    outputType: `${platform.toLowerCase()} pack`,
    tone,
    content,
    originalContent: content,
    approved: false,
    createdAt: new Date().toISOString(),
  };
}

function truncateWords(value: string, words: number) {
  return value.split(/\s+/).slice(0, words).join(" ");
}

function normalizeGeneratedContent(platform: Platform, content: unknown) {
  if (typeof content === "string") return normalizePlatformCopy(platform, content);

  if (content && typeof content === "object" && "content" in content) {
    const value = (content as { content?: unknown }).content;
    if (typeof value === "string") {
      return {
        ...content,
        content: normalizePlatformCopy(platform, value),
      };
    }
  }

  return content;
}
