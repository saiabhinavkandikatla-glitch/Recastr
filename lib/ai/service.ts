import { nanoid } from "nanoid";
import { getGeminiClient } from "@/lib/ai/client";
import {
  briefFromSummary,
  briefFromTranscript,
  fallbackGenerationBrief,
  generationBriefSchema,
  summaryFromBrief,
  type GenerationBrief,
} from "@/lib/ai/brief";
import {
  CONTENT_WRITER_SYSTEM_PROMPT,
  extractBriefPrompt,
  platformWriterPrompt,
} from "@/lib/ai/prompts";
import { summarySchema } from "@/lib/ai/schemas";
import {
  cleanupPost,
  validateContentIsReal,
  validatePlatformPost,
  validateTwitterThread,
} from "@/lib/ai/validation";
import { env } from "@/lib/env";
import { normalizePlatformCopy } from "@/lib/platform-limits";
import { prisma } from "@/lib/prisma/client";
import { getCachedProject } from "@/lib/projects/store";
import type { Platform, SocialOutput, SourceSummary, Tone } from "@/lib/types";

const platformLabels: Record<Platform, string> = {
  TWITTER: "Twitter/X",
  LINKEDIN: "LinkedIn",
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  THREADS: "Threads",
  CAROUSEL: "Carousel",
  COMMUNITY: "Community",
  STORY: "Story",
  HOOKS: "10 Hooks",
  CTA: "Call to Action",
};

export async function summarizeTranscript(transcript: string): Promise<SourceSummary> {
  if (!env.geminiKey) return summaryFromBrief(briefFromTranscript(transcript));

  try {
    const brief = await extractBrief(transcript, "Source content");
    return summaryFromBrief(brief);
  } catch (error) {
    console.error("Gemini API Error (summarizeTranscript):", error);
    if (error instanceof Error && error.message.toLowerCase().includes("api key not valid")) {
      throw new Error("Invalid Gemini API Key - Please get a valid key from Google AI Studio.");
    }
    throw new Error("Failed to process source. Please check your AI API key.");
  }
}

export async function generatePlatformOutputs({
  projectId,
  platforms,
  tone,
  summary: providedSummary,
  isRegeneration,
}: {
  projectId: string;
  platforms: Platform[];
  tone: Tone | string;
  summary?: SourceSummary;
  isRegeneration?: boolean;
}): Promise<SocialOutput[]> {
  const source = await loadProjectSource(projectId, providedSummary);
  const title = source.title || "Untitled source";

  const brief = env.geminiKey
    ? await extractBrief(source.transcript, title).catch(() =>
        briefFromSummary(source.summary, source.transcript),
      )
    : briefFromSummary(source.summary, source.transcript);

  const posts = await generateAllPosts({
    brief,
    title,
    platforms,
    tone,
    isRegeneration,
  });

  return posts.map((post) => ({
    id: `output-${post.platform.toLowerCase()}-${nanoid(10)}`,
    projectId,
    platform: post.platform,
    outputType: `${platformLabels[post.platform]} post`,
    tone,
    content: post.content,
    originalContent: post.content,
    approved: false,
    createdAt: new Date().toISOString(),
  }));
}

/** Step 1 — internal brief extraction. Never shown to user. */
export async function extractBrief(transcript: string, title: string): Promise<GenerationBrief> {
  const gemini = getGeminiClient();
  if (!gemini) return briefFromTranscript(transcript);

  const source = truncateWords(transcript, 5000);
  console.log("[DEBUG] extractBrief called with:");
  console.log("[DEBUG] title:", title);
  console.log("[DEBUG] transcript length:", transcript.length, "words");
  console.log("[DEBUG] truncated source (first 500 chars):", source.slice(0, 500));
  const response = await gemini.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts: [{ text: extractBriefPrompt(source, title) }] }],
    config: {
      temperature: 0.25,
      responseMimeType: "application/json",
    },
  });

  return generationBriefSchema.parse(parseJson(response.text ?? "{}"));
}

/** Step 2 — generate all platform posts in parallel. */
async function generateAllPosts({
  brief,
  title,
  platforms,
  tone,
  isRegeneration,
}: {
  brief: GenerationBrief;
  title: string;
  platforms: Platform[];
  tone: Tone | string;
  isRegeneration?: boolean;
}) {
  const results = await Promise.allSettled(
    platforms.map(async (platform) => {
      const content = env.geminiKey
        ? await generateWithRetry(platform, title, () =>
            writePlatformPost({ brief, title, platform, tone, isRegeneration }),
          ).catch(() => fallbackPostForPlatform(platform, brief))
        : fallbackPostForPlatform(platform, brief);

      const normalized =
        platform === "TWITTER"
          ? content
          : normalizePlatformCopy(platform, content);

      return { platform, content: normalized };
    }),
  );

  return results
    .filter((r): r is PromiseFulfilledResult<{ platform: Platform; content: string }> => r.status === "fulfilled")
    .map((r) => r.value);
}

async function writePlatformPost({
  brief,
  title,
  platform,
  tone,
  isRegeneration,
}: {
  brief: GenerationBrief;
  title: string;
  platform: Platform;
  tone: Tone | string;
  isRegeneration?: boolean;
}) {
  const gemini = getGeminiClient();
  if (!gemini) return fallbackPostForPlatform(platform, brief);

  let prompt = platformWriterPrompt(platform, brief, title);
  if (tone) {
    prompt += `\n\nTONE/REWRITE MODE: ${tone}`;
  }
  if (isRegeneration) {
    prompt +=
      "\n\nCRITICAL: Regeneration — use a completely different hook, structure, and angle.";
  }

  console.log("[DEBUG] writePlatformPost for", platform);
  console.log("[DEBUG] title:", title);
  console.log("[DEBUG] brief:", JSON.stringify(brief, null, 2));
  console.log("[DEBUG] Full prompt being sent to Gemini:", prompt);

  const response = await gemini.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      systemInstruction: CONTENT_WRITER_SYSTEM_PROMPT,
      temperature: 0.85,
    },
  });

  return cleanupPost(response.text ?? "");
}

async function generateWithRetry(platform: Platform, title: string, generateFn: () => Promise<string>) {
  const run = async () => {
    const raw = await generateFn();
    const cleaned = cleanupPost(raw);

    const isRealCheck = validateContentIsReal(cleaned, title);
    if (!isRealCheck.isValid) {
      console.warn(
        `[Validation] Post rejected for ${platform}: ${isRealCheck.error}`,
      );
      return { content: cleaned, isValid: false };
    }

    return validateGenerated(platform, cleaned);
  };

  const first = await run();
  if (first.isValid) return first.content;

  console.log(`[Retry] First attempt failed for ${platform}, retrying...`);
  const second = await run();
  return second.isValid ? second.content : second.content || first.content;
}

function validateGenerated(platform: Platform, raw: string) {
  const cleaned = cleanupPost(raw);
  if (platform === "TWITTER") return validateTwitterThread(cleaned);
  return validatePlatformPost(platform, cleaned);
}

async function loadProjectSource(projectId: string, providedSummary?: SourceSummary) {
  let summary = providedSummary;
  let transcript = "";
  let title = "";

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { summary: true, transcript: true, title: true },
  });

  if (project?.transcript) transcript = project.transcript;
  if (project?.title) title = project.title;
  if (!summary && project?.summary) {
    try {
      summary = summarySchema.parse(project.summary);
    } catch {
      summary = undefined;
    }
  }

  if (!project) {
    const storedProject = getCachedProject(projectId);
    transcript = storedProject?.transcript ?? "";
    title = storedProject?.title ?? "";
    summary = summary ?? storedProject?.summary;
  }

  if (!transcript && summary) {
    transcript = [
      summary.tldr,
      ...summary.takeaways,
      ...summary.hooks,
      summary.topics.join(", "),
      summary.targetAudience,
    ].join("\n");
  }

  console.log("[DEBUG] loadProjectSource:");
  console.log("[DEBUG] projectId:", projectId);
  console.log("[DEBUG] title:", title);
  console.log("[DEBUG] transcript from DB/storage (first 200 chars):", transcript.slice(0, 200));
  console.log("[DEBUG] transcript length:", transcript.length);

  return {
    transcript,
    title,
    summary: summary ?? summaryFromBrief(briefFromTranscript(transcript || title || projectId)),
  };
}

function fallbackPostForPlatform(platform: Platform, brief: GenerationBrief) {
  switch (platform) {
    case "TWITTER":
      return [
        `${brief.hook_angle}`,
        "",
        `1/ ${brief.core_promise}`,
        "",
        `2/ ${brief.key_steps[0]}`,
        "",
        `3/ ${brief.key_steps[1] ?? brief.key_steps[0]}`,
        "",
        `4/ ${brief.key_steps[2] ?? "Start with one clear action."}`,
        "",
        brief.cta,
      ].join("\n");
    case "LINKEDIN":
      return [
        brief.hook_angle,
        "",
        brief.pain_point,
        "",
        brief.core_promise,
        "",
        ...brief.key_steps.slice(0, 4).map((point, index) => `${index + 1}. ${point}`),
        "",
        brief.cta,
        "",
        "#ContentCreation #Creators #BuildInPublic",
      ].join("\n");
    case "INSTAGRAM":
      return [
        brief.hook_angle.slice(0, 125),
        "",
        `→ ${brief.core_promise}`,
        `→ ${brief.key_steps[0]}`,
        `→ ${brief.key_steps[1] ?? brief.key_steps[0]}`,
        "",
        brief.cta,
        "",
        "#content #creator #socialmedia #repurpose #ai #marketing",
      ].join("\n");
    case "FACEBOOK":
      return [
        brief.hook_angle,
        "",
        brief.core_promise,
        "",
        brief.key_steps.slice(0, 3).join("\n"),
        "",
        brief.cta,
      ].join("\n");
    case "THREADS":
      return [
        brief.hook_angle,
        "---",
        brief.core_promise,
        "---",
        brief.key_steps[0],
        "---",
        brief.cta,
      ].join("\n");
    case "CAROUSEL":
      return [
        `SLIDE 1: ${brief.hook_angle}\n- ${brief.core_promise}`,
        `SLIDE 2: The problem\n- ${brief.pain_point}`,
        `SLIDE 3: Step 1\n- ${brief.key_steps[0]}`,
        `SLIDE 4: Step 2\n- ${brief.key_steps[1] ?? brief.key_steps[0]}`,
        `SLIDE 5: ${brief.cta}\n- Save this for later`,
      ].join("\n---\n");
    case "COMMUNITY":
      return [
        brief.hook_angle,
        "",
        "What would help you most next?",
        "",
        "A) Step-by-step walkthrough",
        "B) Common mistakes",
        "C) Full breakdown",
        "D) Templates and examples",
      ].join("\n");
    case "STORY":
      return [
        "[HOOK — 0 to 3 sec]",
        brief.hook_angle,
        "",
        "[BODY — 3 to 40 sec]",
        brief.core_promise,
        brief.key_steps[0],
        "",
        "[CTA — 40 to 60 sec]",
        brief.cta,
      ].join("\n");
    case "HOOKS":
      return [
        brief.hook_angle,
        "---",
        brief.pain_point,
        "---",
        `Unpopular opinion: ${brief.core_promise}`,
        "---",
        brief.key_steps[0],
      ].join("\n");
    case "CTA":
      return [
        "What do you think? Drop a comment below.",
        "---",
        "DM me for the free checklist.",
        "---",
        "Link in bio to get started.",
        "---",
        "Subscribe for weekly breakdowns like this.",
      ].join("\n");
  }
}

function parseJson(value: string) {
  return JSON.parse(value.replace(/```json|```/g, "").trim());
}

function truncateWords(value: string, words: number) {
  return value.split(/\s+/).slice(0, words).join(" ");
}

// Re-export for tests
export { validateGenerated, fallbackGenerationBrief };
