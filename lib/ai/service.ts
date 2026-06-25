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
  
  if (!env.geminiKey) return localSummary;

  try {
    const brief = await extractBrief(transcript, "Source content");
    return summaryFromBrief(brief);
  } catch (error) {
    console.error("Gemini API Error (summarizeTranscript), falling back to local summary:", error);
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

  const brief = env.geminiKey
    ? await extractBrief(source.transcript, title).catch(() =>
        briefFromSummary(source.summary, source.transcript),
      )
    : briefFromSummary(source.summary, source.transcript);
  const groundedBrief = groundBriefInSource(brief, title, source.transcript, source.summary);

  const posts = await generateAllPosts({
    brief: groundedBrief,
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
          ).catch(() => fallbackPostForPlatform(platform, brief, tone))
        : fallbackPostForPlatform(platform, brief, tone);

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
  if (!gemini) return fallbackPostForPlatform(platform, brief, tone);

  let prompt = platformWriterPrompt(platform, brief, title);

  // Add tone-specific instructions if available
  if (tone && typeof tone === "string" && toneInstructions[tone as Tone]) {
    prompt += `\n\nTONE/REWRITE MODE: ${toneInstructions[tone as Tone]}`;
  }

  if (isRegeneration) {
    prompt +=
      "\n\nCRITICAL: Regeneration — use a completely different hook, structure, and angle.";
  }

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

  return {
    transcript,
    title,
    summary: summary ?? summaryFromBrief(briefFromTranscript(transcript || title || projectId)),
  };
}

function fallbackPostForPlatform(platform: Platform, brief: GenerationBrief, tone?: Tone | string) {
  const normalizedTone = normalizeToneName(tone);
  const toneLine = fallbackToneLine(tone, brief);
  switch (platform) {
    case "TWITTER":
      if (normalizedTone === "casual") {
        return [
          toneLine,
          "",
          "What I would pull from it:",
          `- ${brief.core_promise}`,
          `- ${brief.key_steps[0]}`,
          `- ${brief.key_steps[1] ?? brief.key_steps[0]}`,
          "",
          `No need to overthink the format. ${brief.cta}`,
        ].join("\n");
      }
      return [
        toneLine,
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
      if (normalizedTone === "casual") {
        return [
          toneLine,
          "",
          "The move is pretty straightforward:",
          "",
          `• ${brief.core_promise}`,
          `• ${brief.key_steps[0]}`,
          `• ${brief.key_steps[1] ?? brief.key_steps[0]}`,
          "",
          brief.cta,
        ].join("\n");
      }
      return [
        toneLine,
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
      if (normalizedTone === "casual") {
        return [
          toneLine.slice(0, 125),
          "",
          `quick note: ${brief.core_promise}`,
          `save this: ${brief.key_steps[0]}`,
          `try this next: ${brief.key_steps[1] ?? brief.key_steps[0]}`,
          "",
          brief.cta,
          "",
          "#content #creator #repurpose #socialmedia",
        ].join("\n");
      }
      return [
        toneLine.slice(0, 125),
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
        toneLine,
        "",
        brief.core_promise,
        "",
        brief.key_steps.slice(0, 3).join("\n"),
        "",
        brief.cta,
      ].join("\n");
    case "THREADS":
      return [
        toneLine,
        "---",
        brief.core_promise,
        "---",
        brief.key_steps[0],
        "---",
        brief.cta,
      ].join("\n");
    case "CAROUSEL":
      return [
        `SLIDE 1: ${toneLine}\n- ${brief.core_promise}`,
        `SLIDE 2: The problem\n- ${brief.pain_point}`,
        `SLIDE 3: Step 1\n- ${brief.key_steps[0]}`,
        `SLIDE 4: Step 2\n- ${brief.key_steps[1] ?? brief.key_steps[0]}`,
        `SLIDE 5: ${brief.cta}\n- Save this for later`,
      ].join("\n---\n");
    case "COMMUNITY":
      return [
        toneLine,
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
        toneLine,
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
        toneLine,
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
    core_promise: useIfNotTitleEcho(brief.core_promise, fallback.core_promise, title),
    pain_point: useIfNotTitleEcho(brief.pain_point, fallback.pain_point, title),
    key_steps: brief.key_steps.map((step, index) =>
      useIfNotTitleEcho(step, fallback.key_steps[index] ?? fallback.core_promise, title),
    ),
    hook_angle: useIfNotTitleEcho(brief.hook_angle, fallback.hook_angle, title),
    target_audience: useIfNotTitleEcho(brief.target_audience, fallback.target_audience, title),
    cta: useIfNotTitleEcho(brief.cta, fallback.cta, title),
    specific_detail: useIfNotTitleEcho(
      brief.specific_detail ?? "",
      fallback.specific_detail ?? fallback.key_steps[0] ?? fallback.core_promise,
      title,
    ),
  };
}

function useIfNotTitleEcho(value: string, fallback: string, title: string) {
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

// Re-export for tests
export { validateGenerated, fallbackGenerationBrief };
