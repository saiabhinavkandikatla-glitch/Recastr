import { nanoid } from "nanoid";
import { generateAIText, getAIClient } from "@/lib/ai/client";
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

const MIN_GENERATION_TRANSCRIPT_WORDS = 50;

// Tone-specific instructions to guide the AI
const toneInstructions: Record<Tone, string> = {
  Professional: "Polished, confident, formal. No slang.",
  Casual: "Relaxed, conversational, like texting a friend.",
  Storytelling: "Narrative arc. Setup, tension, payoff.",
  Viral: "Bold claims. Built to stop a scroll. Pattern interrupts.",
  Educational: "Clear structure. Teach one concept at a time.",
  Founder: "Direct, opinionated, from lived experience.",
  "Personal Brand": "Personal, first-person, connects to a bigger life lesson.",
  Witty: "Witty and clever. Use wordplay and humor.",
  Bold: "Bold and direct. Take a strong stance.",
  Empathetic: "Empathetic and understanding. Show compassion.",
  Controversial: "Controversial and provocative. Challenge common beliefs.",
};

export async function summarizeTranscript(transcript: string): Promise<SourceSummary> {
  const localSummary = summaryFromBrief(briefFromTranscript(transcript));
  
  if (!env.openaiKey) return localSummary;

  try {
    const brief = await extractBrief(transcript, "Source content");
    return summaryFromBrief(brief);
  } catch (error) {
    console.error("OpenAI API Error (summarizeTranscript), falling back to local summary:", error);
    return localSummary;
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

  const transcriptWords = source.transcript.split(/\s+/).filter(Boolean).length;
  if (
    !source.transcript ||
    transcriptWords < MIN_GENERATION_TRANSCRIPT_WORDS ||
    source.transcript.includes("Content generation requires a transcript")
  ) {
    throw new Error(
      `Cannot generate posts: real transcript is required. Current transcript words=${transcriptWords}.`,
    );
  }

  const brief = await extractBrief(source.transcript, title).catch((error) => {
    console.error("Brief extraction provider failed, using transcript-grounded fallback:", error);
    return briefFromTranscript(source.transcript);
  });
  const groundedBrief = groundBriefInSource(brief, title, source.transcript, source.summary);

  const posts = await generateAllPosts({
    brief: groundedBrief,
    title,
    platforms,
    tone,
    isRegeneration,
    transcriptLength: source.transcript.length,
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
  const aiClient = getAIClient();
  if (!aiClient) return briefFromTranscript(transcript);

  const source = truncateWords(transcript, 5000);
  const prompt = extractBriefPrompt(source, title);

  console.log("======================================== LLM PROMPT (extractBrief) ========================================");
  console.log(prompt);
  console.log("============================================================================================");
  console.log(`Transcript length: ${transcript.length}`);
  console.log(`Fact count: N/A (Brief extraction)`);
  console.log(`Context length: ${prompt.length}`);
  console.log(`Prompt size: ${prompt.length}`);
  console.log(`Provider: OpenAI`);
  console.log(`Model: OpenAI configured model`);
  console.log("============================================================================================");

  const text = await generateAIText({
    model: "gpt-5.4-mini",
    prompt,
    temperature: 0.25,
    responseMimeType: "application/json",
  });

  return generationBriefSchema.parse(parseJson(text || "{}"));
}

/** Step 2 — generate all platform posts in parallel. */
async function generateAllPosts({
  brief,
  title,
  platforms,
  tone,
  isRegeneration,
  transcriptLength,
}: {
  brief: GenerationBrief;
  title: string;
  platforms: Platform[];
  tone: Tone | string;
  isRegeneration?: boolean;
  transcriptLength: number;
}) {
  const results = await Promise.all(
    platforms.map(async (platform) => {
      const content = await generateWithRetry(platform, title, () =>
        writePlatformPost({ brief, title, platform, tone, isRegeneration, transcriptLength }),
      );

      const normalized =
        platform === "TWITTER"
          ? content
          : normalizePlatformCopy(platform, content);

      return { platform, content: normalized };
    }),
  );

  return results;
}

async function writePlatformPost({
  brief,
  title,
  platform,
  tone,
  isRegeneration,
  transcriptLength,
}: {
  brief: GenerationBrief;
  title: string;
  platform: Platform;
  tone: Tone | string;
  isRegeneration?: boolean;
  transcriptLength: number;
}) {
  const aiClient = getAIClient();
  if (!aiClient) throw new Error("OpenAI API client not configured.");

  let prompt = platformWriterPrompt(platform, brief, title);

  // Add tone-specific instructions if available
  if (tone && typeof tone === "string" && toneInstructions[tone as Tone]) {
    prompt += `\n\nTONE/REWRITE MODE: ${toneInstructions[tone as Tone]}`;
  }

  if (isRegeneration) {
    prompt +=
      "\n\nCRITICAL: Regeneration — use a completely different hook, structure, and angle.";
  }

  const factCount = 
    (brief.core_promise ? 1 : 0) +
    (brief.pain_point ? 1 : 0) +
    (brief.key_steps?.length ?? 0) +
    (brief.hook_angle ? 1 : 0) +
    (brief.specific_detail ? 1 : 0);

  console.log(`======================================== LLM PROMPT (writePlatformPost for ${platform}) ========================================`);
  console.log(prompt);
  console.log("============================================================================================");
  console.log(`Transcript length: ${transcriptLength}`);
  console.log(`Fact count: ${factCount}`);
  console.log(`Context length: ${prompt.length}`);
  console.log(`Prompt size: ${prompt.length}`);
  console.log(`Provider: OpenAI`);
  console.log(`Model: OpenAI configured model`);
  console.log("============================================================================================");

  // Validation: If no real facts are present, fail loudly
  if (factCount === 0) {
    throw new Error("Prompt validation failed: No real transcript facts/insights supplied. Stopping generation.");
  }

  try {
    const text = await generateAIText({
      model: "gpt-5.4-mini",
      prompt,
      systemInstruction: CONTENT_WRITER_SYSTEM_PROMPT,
      temperature: 0.85,
    });

    return cleanupPost(text);
  } catch (error) {
    console.error(`Platform generation provider failed for ${platform}, using transcript-grounded fallback:`, error);
    return writeLocalPlatformPost(platform, brief);
  }
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
  if (!second.isValid) {
    throw new Error(`Generated content validation failed for platform ${platform}.`);
  }
  return second.content;
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

  return {
    transcript,
    title,
    summary: summary ?? summaryFromBrief(briefFromTranscript(transcript || title || projectId)),
  };
}

function parseJson(value: string) {
  return JSON.parse(value.replace(/```json|```/g, "").trim());
}

function groundBriefInSource(
  brief: GenerationBrief,
  title: string,
  transcript: string,
  summary?: SourceSummary,
): GenerationBrief {
  const evidenceText = [
    transcript,
    summary?.tldr,
    ...(summary?.takeaways ?? []),
    ...(summary?.hooks ?? []),
  ]
    .filter(Boolean)
    .join("\n");
  const fallback = briefFromTranscript(evidenceText);

  return {
    core_promise: keepIfNotTitleEcho(brief.core_promise, fallback.core_promise, title),
    pain_point: keepIfNotTitleEcho(brief.pain_point, fallback.pain_point, title),
    key_steps: brief.key_steps.map((step, index) =>
      keepIfNotTitleEcho(step, fallback.key_steps[index] ?? fallback.core_promise, title),
    ),
    hook_angle: keepIfNotTitleEcho(brief.hook_angle, fallback.hook_angle, title),
    target_audience: keepIfNotTitleEcho(brief.target_audience, fallback.target_audience, title),
    cta: keepIfNotTitleEcho(brief.cta, fallback.cta, title),
    specific_detail: keepIfNotTitleEcho(
      brief.specific_detail ?? "",
      fallback.specific_detail ?? fallback.key_steps[0] ?? fallback.core_promise,
      title,
    ),
  };
}

function keepIfNotTitleEcho(value: string, fallback: string, title: string) {
  const trimmed = value.trim();
  if (!trimmed || echoesTitle(trimmed, title)) return fallback;
  return trimmed;
}

function echoesTitle(value: string, title: string) {
  const normalizedValue = normalizeForComparison(value);
  const normalizedTitle = normalizeForComparison(title);
  if (!normalizedValue || !normalizedTitle) return false;
  if (normalizedValue.includes(`"${normalizedTitle}"`) || normalizedValue.includes(normalizedTitle)) {
    return true;
  }

  const titleWords = normalizedTitle.split(/\s+/).filter((word) => word.length > 3);
  if (titleWords.length < 3) return false;
  const matchedWords = titleWords.filter((word) => normalizedValue.includes(word));
  return matchedWords.length / titleWords.length > 0.7;
}

function normalizeForComparison(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\w\s"]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function fallbackToneLine(tone: Tone | string | undefined, brief: GenerationBrief) {
  const normalizedTone = normalizeToneName(tone);
  if (normalizedTone === "casual") {
    return `Here's the simple version: ${brief.hook_angle}`;
  }
  if (normalizedTone === "storytelling") {
    return `It starts with this tension: ${brief.pain_point}`;
  }
  if (normalizedTone === "viral") {
    return `Stop missing this: ${brief.hook_angle}`;
  }
  if (normalizedTone === "educational") {
    return `A useful way to understand this: ${brief.core_promise}`;
  }
  if (normalizedTone === "founder") {
    return `If I were building from this lesson, I would start here: ${brief.hook_angle}`;
  }
  if (normalizedTone === "personal brand") {
    return `This connects to a bigger lesson: ${brief.core_promise}`;
  }
  return brief.hook_angle;
}

function normalizeToneName(tone: Tone | string | undefined) {
  return String(tone ?? "Professional").toLowerCase().replace(/_/g, " ");
}

function truncateWords(value: string, words: number) {
  return value.split(/\s+/).slice(0, words).join(" ");
}

function writeLocalPlatformPost(platform: Platform, brief: GenerationBrief) {
  const steps = brief.key_steps.filter(Boolean).slice(0, 3);
  const detail = brief.specific_detail ?? steps[2] ?? brief.core_promise;

  switch (platform) {
    case "TWITTER":
      return [
        `1/ ${brief.hook_angle}`,
        `2/ ${brief.core_promise}`,
        `3/ ${steps[0] ?? detail}`,
        `4/ ${steps[1] ?? detail}`,
        `5/ ${steps[2] ?? detail}`,
        `6/ ${brief.cta}`,
      ].join("\n---\n");
    case "LINKEDIN":
      return [
        brief.hook_angle,
        "",
        brief.core_promise,
        "",
        ...steps.map((step) => `- ${step}`),
        "",
        `The useful detail: ${detail}`,
        "",
        brief.cta,
      ].join("\n");
    case "INSTAGRAM":
      return [
        brief.hook_angle,
        "",
        brief.core_promise,
        "",
        ...steps.map((step) => `-> ${step}`),
        "",
        `Save this: ${detail}`,
      ].join("\n");
    case "CAROUSEL":
      return [
        `SLIDE 1: ${brief.hook_angle}`,
        "---",
        `SLIDE 2: ${steps[0] ?? brief.core_promise}`,
        "---",
        `SLIDE 3: ${steps[1] ?? detail}`,
        "---",
        `SLIDE 4: ${steps[2] ?? detail}`,
        "---",
        `SLIDE 5: ${brief.cta}`,
      ].join("\n");
    case "COMMUNITY":
      return `${brief.hook_angle}\n\n${brief.core_promise}\n\nA) ${steps[0] ?? detail}\nB) ${steps[1] ?? detail}\nC) ${steps[2] ?? detail}\nD) ${brief.cta}`;
    case "HOOKS":
      return [brief.hook_angle, brief.core_promise, brief.pain_point, detail, ...steps].join("\n---\n");
    case "CTA":
      return [brief.cta, `Save this if you need: ${detail}`, `Try this next: ${steps[0] ?? detail}`, `Share this with ${brief.target_audience}`].join("\n---\n");
    case "FACEBOOK":
    case "THREADS":
    case "STORY":
    default:
      return [brief.hook_angle, "", brief.core_promise, "", ...steps, "", brief.cta].join("\n");
  }
}

// Re-export for tests
export { validateGenerated, fallbackGenerationBrief };
