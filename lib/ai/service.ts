import { nanoid } from "nanoid";
import { z } from "zod";
import { getGeminiClient } from "@/lib/ai/client";
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
  if (!env.geminiKey) return fallbackSummary;

  const gemini = getGeminiClient();
  if (!gemini) return fallbackSummary;

  try {
    const response = await gemini.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `You are an expert content analyst. Return only valid JSON with tldr, takeaways, hooks, detectedTone, topics, and targetAudience.\n\nTranscript:\n${truncateWords(transcript, 6000)}\n\nReturn: tldr string, exactly 5 takeaways, exactly 10 hooks, detectedTone as educational/motivational/controversial/storytelling/news, 3-5 topics, targetAudience.`,
            },
          ],
        },
      ],
      config: {
        temperature: 0.35,
        responseMimeType: "application/json",
      },
    });

    const content = response.text;
    if (!content) return fallbackSummary;
    return summarySchema.parse(JSON.parse(content));
  } catch (error) {
    console.error("Gemini API Error (summarizeTranscript):", error);
    if (error instanceof Error && error.message.toLowerCase().includes("api key not valid")) {
      throw new Error("Invalid Gemini API Key - Please get a valid key starting with 'AIzaSy' from Google AI Studio.");
    }
    throw new Error("Failed to process with Gemini. Please check your API key.");
  }
}

export async function generatePlatformOutputs({
  projectId,
  platforms,
  tone,
  summary: providedSummary,
}: {
  projectId: string;
  platforms: Platform[];
  tone: Tone | string;
  summary?: SourceSummary;
}): Promise<SocialOutput[]> {
  if (!env.geminiKey) {
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
          originalContent: output.originalContent,
        }));
    }
    return platforms.map((platform) => createFallbackOutput(projectId, platform, tone));
  }

  let summary = providedSummary;
  if (!summary) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { summary: true },
    });
    if (project?.summary) {
      try {
        summary = summarySchema.parse(project.summary);
      } catch {
        // Ignore
      }
    }
  }

  const gemini = getGeminiClient();
  if (!gemini) throw new Error("gemini_missing");

  const completions = await Promise.all(
    platforms.map(async (platform) => {
      try {
        const response = await gemini.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `You are a social media ghostwriter. Return a JSON object exactly like: {"content": "the post body", "hook_score": 8, "estimated_engagement": "High", "platform_tips": ["tip1"]}\n\nPlatform: ${platform}\nTone: ${tone}\nTopic: ${summary?.tldr ?? "Content repurposing"}\n\nTask: ${platformPrompt[platform]}\nReturn valid JSON.`,
                },
              ],
            },
          ],
          config: {
            temperature: 0.7,
            responseMimeType: "application/json",
          },
        });

        const parsed = generationSchema.parse(JSON.parse(response.text ?? "{}"));
        const content = normalizeGeneratedContent(platform, parsed);

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
      } catch (error) {
        console.error(`Gemini API Error (generatePlatformOutputs - ${platform}):`, error);
        if (error instanceof Error && error.message.toLowerCase().includes("api key not valid")) {
          throw new Error("Invalid Gemini API Key - Please get a valid key starting with 'AIzaSy' from Google AI Studio.");
        }
        throw new Error("Failed to generate content with Gemini. Please check your API key.");
      }
    }),
  );

  return completions;
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
