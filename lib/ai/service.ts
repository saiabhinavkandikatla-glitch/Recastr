import { nanoid } from "nanoid";
import { z } from "zod";
import { getGeminiClient } from "@/lib/ai/client";
import { summarySchema } from "@/lib/ai/schemas";
import { env } from "@/lib/env";
import { getPlatformCharacterLimit, normalizePlatformCopy } from "@/lib/platform-limits";
import { prisma } from "@/lib/prisma/client";
import { getCachedProject } from "@/lib/projects/store";
import type { Platform, SocialOutput, SourceSummary, Tone } from "@/lib/types";

const contentBriefSchema = z.object({
  core_insight: z.string().min(12),
  supporting_points: z.array(z.string().min(4)).min(3).max(5),
  emotional_hook: z.string().min(8),
  audience: z.string().min(4),
  transformation: z.object({
    before: z.string().min(4),
    after: z.string().min(4),
  }),
  tone: z.enum(["educational", "motivational", "contrarian", "storytelling"]),
  strongest_quote: z.string().min(4),
});

type ContentBrief = z.infer<typeof contentBriefSchema>;

const generatedPostSchema = z.object({
  content: z.string().min(20),
});

const fallbackBrief: ContentBrief = {
  core_insight: "One strong source becomes useful when the clearest idea is rewritten for the platform instead of copied.",
  supporting_points: [
    "Start with the audience problem.",
    "Use one simple mental model.",
    "Make the next action obvious.",
  ],
  emotional_hook: "Most creators do not need more ideas. They need better extraction.",
  audience: "Creators, founders, and content teams",
  transformation: {
    before: "A long source feels hard to repurpose.",
    after: "The source becomes a set of clear, useful posts.",
  },
  tone: "educational",
  strongest_quote: "Repurpose the idea, not the exact wording.",
};

const platformLabels: Record<Platform, string> = {
  TWITTER: "Twitter/X",
  LINKEDIN: "LinkedIn",
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  THREADS: "Threads",
  YOUTUBE: "YouTube Shorts",
  CAROUSEL: "Carousel",
  COMMUNITY: "Community",
  STORY: "Story",
};

const bannedPhrases = [
  "turn the strongest idea",
  "convert the source",
  "shape the idea",
  "available youtube metadata",
  "starter hooks",
  "can become",
  "could become",
  "should become",
  "this post should",
  "write a",
  "generate a",
  "platform-native content pack",
  "platform-native posts instead",
  "same source, different platform",
  "recastr",
  "in conclusion",
  "it is important to note",
  "i hope this helps",
];

export async function summarizeTranscript(transcript: string): Promise<SourceSummary> {
  if (!env.geminiKey) return sourceSummaryFromBrief(createFallbackBriefFromTranscript(transcript));

  const gemini = getGeminiClient();
  if (!gemini) return sourceSummaryFromBrief(createFallbackBriefFromTranscript(transcript));

  try {
    const brief = await extractContentBrief(transcript);
    return sourceSummaryFromBrief(brief);
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
}: {
  projectId: string;
  platforms: Platform[];
  tone: Tone | string;
  summary?: SourceSummary;
}): Promise<SocialOutput[]> {
  const source = await loadProjectSource(projectId, providedSummary);
  const brief = env.geminiKey
    ? await extractContentBrief(source.transcript, source.summary).catch(() => briefFromSummary(source.summary, source.transcript))
    : briefFromSummary(source.summary, source.transcript);

  const outputs = await Promise.all(
    platforms.map(async (platform) => {
      const content = env.geminiKey
        ? await generatePlatformPost({ brief, platform, tone }).catch(() => fallbackPostForPlatform(platform, brief))
        : fallbackPostForPlatform(platform, brief);
      const normalizedContent = platform === "TWITTER" ? content : normalizePlatformCopy(platform, content);

      return {
        id: `output-${platform.toLowerCase()}-${nanoid(10)}`,
        projectId,
        platform,
        outputType: `${platformLabels[platform]} post`,
        tone,
        content: normalizedContent,
        originalContent: normalizedContent,
        approved: false,
        createdAt: new Date().toISOString(),
      };
    }),
  );

  return outputs;
}

async function loadProjectSource(projectId: string, providedSummary?: SourceSummary) {
  let summary = providedSummary;
  let transcript = "";

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { summary: true, transcript: true, title: true },
  });

  if (project?.transcript) transcript = project.transcript;
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
    summary: summary ?? sourceSummaryFromBrief(createFallbackBriefFromTranscript(transcript || project?.title || projectId)),
  };
}

async function extractContentBrief(transcript: string, summary?: SourceSummary): Promise<ContentBrief> {
  const gemini = getGeminiClient();
  if (!gemini) return briefFromSummary(summary, transcript);

  const source = truncateWords(transcript || summaryToText(summary), 5000);
  const response = await gemini.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        role: "user",
        parts: [
          {
            text: [
              "You are a content strategist. Extract a reusable content brief from the source.",
              "",
              "Return ONLY valid JSON. No markdown, no explanation, no preamble.",
              "",
              "JSON shape:",
              '{ "core_insight": "...", "supporting_points": ["...", "...", "..."], "emotional_hook": "...", "audience": "...", "transformation": { "before": "...", "after": "..." }, "tone": "educational|motivational|contrarian|storytelling", "strongest_quote": "..." }',
              "",
              "SOURCE:",
              source,
            ].join("\n"),
          },
        ],
      },
    ],
    config: {
      temperature: 0.25,
      responseMimeType: "application/json",
    },
  });

  return contentBriefSchema.parse(parseJson(response.text ?? "{}"));
}

async function generatePlatformPost({
  brief,
  platform,
  tone,
}: {
  brief: ContentBrief;
  platform: Platform;
  tone: Tone | string;
}) {
  const gemini = getGeminiClient();
  if (!gemini) return fallbackPostForPlatform(platform, brief);

  let retryErrors: string[] = [];
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await gemini.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: platformPrompt({ brief, platform, tone, retryErrors }) }] }],
      config: {
        temperature: 0.65,
        responseMimeType: "application/json",
      },
    });
    const parsed = generatedPostSchema.parse(parseJson(response.text ?? "{}"));
    const content = cleanupPost(parsed.content);
    const validation = validatePost(platform, content);
    if (validation.isValid) return content;
    retryErrors = validation.errors;
  }

  return fallbackPostForPlatform(platform, brief);
}

function platformPrompt({
  brief,
  platform,
  tone,
  retryErrors,
}: {
  brief: ContentBrief;
  platform: Platform;
  tone: Tone | string;
  retryErrors: string[];
}) {
  const retryInstruction = retryErrors.length
    ? `\nPrevious draft failed validation: ${retryErrors.join("; ")}. Rewrite it now.`
    : "";
  return [
    basePrompt(brief, tone),
    platformInstruction(platform),
    retryInstruction,
    "",
    "BANNED: Do not explain what you are doing. Do not describe the post. Do not use meta-commentary. Write the final post itself.",
    'Return ONLY JSON exactly like: {"content":"final post text here"}',
  ].join("\n");
}

function basePrompt(brief: ContentBrief, tone: Tone | string) {
  return [
    "You are a top social media creator. Write finished, ready-to-post content from this brief.",
    "",
    "CONTENT BRIEF:",
    `Core insight: ${brief.core_insight}`,
    `Supporting points: ${brief.supporting_points.join(" | ")}`,
    `Hook angle: ${brief.emotional_hook}`,
    `Audience: ${brief.audience}`,
    `Transformation: ${brief.transformation.before} -> ${brief.transformation.after}`,
    `Tone: ${tone || brief.tone}`,
    `Strongest quote: ${brief.strongest_quote}`,
  ].join("\n");
}

function platformInstruction(platform: Platform) {
  switch (platform) {
    case "TWITTER":
      return [
        "TWITTER/X THREAD RULES:",
        "- First tweet: bold hook, max 220 chars.",
        '- Tweets 2-6: numbered with "N/".',
        "- One idea per tweet. Use line breaks.",
        "- Last tweet: clear CTA.",
        "- Total 6-8 tweets. Each tweet max 280 chars.",
        "- Separate tweets with ---.",
      ].join("\n");
    case "LINKEDIN":
      return [
        "LINKEDIN RULES:",
        "- Line 1: one powerful hook sentence.",
        "- Short paragraphs with blank lines.",
        "- Use a personal or direct teaching voice.",
        "- Include a numbered list of 3-5 points.",
        "- End with one CTA and 3-5 hashtags.",
        "- 150-250 words.",
      ].join("\n");
    case "INSTAGRAM":
      return [
        "INSTAGRAM CAPTION RULES:",
        "- Line 1: punchy hook under 125 chars.",
        "- 3-5 short value lines.",
        "- Use arrows or checkmarks for lists.",
        "- CTA: save this or link in bio.",
        "- End with 8-15 hashtags.",
      ].join("\n");
    case "YOUTUBE":
      return [
        "YOUTUBE SHORTS SCRIPT RULES:",
        "- Format with [HOOK - 0 to 3 seconds], [BODY - 3 to 35 seconds], [CTA - 35 to 60 seconds].",
        "- Written to be spoken.",
        "- Grade 6 reading level.",
        "- 80-120 words.",
      ].join("\n");
    case "FACEBOOK":
      return [
        "FACEBOOK POST RULES:",
        "- Warm, direct feed post.",
        "- 80-180 words.",
        "- Invite comments with one specific question.",
        "- No hashtags unless essential.",
      ].join("\n");
    case "THREADS":
      return [
        "THREADS RULES:",
        "- Conversational 4-6 post sequence.",
        "- Short sentences.",
        "- Use --- between posts.",
        "- End with a reply-friendly prompt.",
      ].join("\n");
    case "CAROUSEL":
      return [
        "CAROUSEL RULES:",
        "- 7 slides.",
        "- Format each as Slide N: headline | body.",
        "- Cover, 5 value slides, CTA slide.",
      ].join("\n");
    case "COMMUNITY":
      return [
        "COMMUNITY POST RULES:",
        "- Write a YouTube community post or poll.",
        "- Include 4 answer options if it is a poll.",
        "- Make the question specific.",
      ].join("\n");
    case "STORY":
      return [
        "STORY RULES:",
        "- 5 story frames.",
        "- Format each as Frame N: text | visual direction.",
        "- Include one interaction sticker prompt.",
      ].join("\n");
  }
}

function validatePost(platform: Platform, post: string) {
  const errors: string[] = [];
  const lower = post.toLowerCase();
  for (const phrase of bannedPhrases) {
    if (lower.includes(phrase)) errors.push(`contains banned phrase: ${phrase}`);
  }
  if (post.trim().length < 40) errors.push("too short");

  if (platform === "TWITTER") {
    const tweets = parseTwitterThread(post);
    if (tweets.length < 4) errors.push("twitter thread needs at least 4 tweets");
    tweets.forEach((tweet, index) => {
      if (tweet.length > 280) errors.push(`tweet ${index + 1} is over 280 chars`);
    });
  } else {
    const limit = getPlatformCharacterLimit(platform);
    if (post.length > limit * 1.15) errors.push(`over ${platformLabels[platform]} character limit`);
  }

  return { isValid: errors.length === 0, errors };
}

function parseTwitterThread(raw: string) {
  return raw
    .split("---")
    .map((part) => part.replace(/^TWEET \d+:\s*/i, "").trim())
    .filter(Boolean);
}

function fallbackPostForPlatform(platform: Platform, brief: ContentBrief) {
  switch (platform) {
    case "TWITTER":
      return [
        `${brief.emotional_hook}`,
        "",
        `1/ ${brief.core_insight}`,
        "",
        `2/ ${brief.supporting_points[0]}`,
        "",
        `3/ ${brief.supporting_points[1] ?? brief.supporting_points[0]}`,
        "",
        `4/ ${brief.supporting_points[2] ?? "Start with one clear action."}`,
        "",
        `Save this before your next build.`,
      ].join("\n");
    case "LINKEDIN":
      return [
        brief.emotional_hook,
        "",
        `I used to think ${brief.transformation.before.toLowerCase()}.`,
        "",
        `Then I realized: ${brief.core_insight}`,
        "",
        "Here is the simple version:",
        "",
        ...brief.supporting_points.slice(0, 4).map((point, index) => `${index + 1}. ${point}`),
        "",
        brief.transformation.after,
        "",
        "Save this if you are building the next version.",
        "",
        "#AI #APIs #BuildInPublic #Learning",
      ].join("\n");
    case "INSTAGRAM":
      return [
        brief.emotional_hook.slice(0, 125),
        "",
        `-> ${brief.core_insight}`,
        `-> ${brief.supporting_points[0]}`,
        `-> ${brief.supporting_points[1] ?? brief.supporting_points[0]}`,
        `-> ${brief.transformation.after}`,
        "",
        "Save this before you start.",
        "",
        "#AI #APIs #ChatGPT #BuildWithAI #CreatorTech #LearnToCode #Automation #TechForBeginners",
      ].join("\n");
    case "YOUTUBE":
      return [
        "[HOOK - 0 to 3 seconds]",
        brief.emotional_hook,
        "",
        "[BODY - 3 to 35 seconds]",
        brief.core_insight,
        brief.supporting_points.slice(0, 3).join("\n"),
        "",
        "[CTA - 35 to 60 seconds]",
        "Save this and watch the full breakdown before you build.",
      ].join("\n");
    case "FACEBOOK":
      return [
        brief.emotional_hook,
        "",
        brief.core_insight,
        "",
        brief.supporting_points.slice(0, 3).join("\n"),
        "",
        `What would help you get from "${brief.transformation.before}" to "${brief.transformation.after}" faster?`,
      ].join("\n");
    case "THREADS":
      return [
        brief.emotional_hook,
        "---",
        brief.core_insight,
        "---",
        brief.supporting_points[0],
        "---",
        brief.supporting_points[1] ?? brief.supporting_points[0],
        "---",
        "What part should we break down next?",
      ].join("\n");
    case "CAROUSEL":
      return [
        `Slide 1: ${brief.emotional_hook} | A simple promise for the reader.`,
        `Slide 2: The problem | ${brief.transformation.before}`,
        `Slide 3: The shift | ${brief.core_insight}`,
        `Slide 4: Point 1 | ${brief.supporting_points[0]}`,
        `Slide 5: Point 2 | ${brief.supporting_points[1] ?? brief.supporting_points[0]}`,
        `Slide 6: Point 3 | ${brief.supporting_points[2] ?? brief.supporting_points[0]}`,
        `Slide 7: CTA | Save this before your next project.`,
      ].join("\n");
    case "COMMUNITY":
      return [
        `${brief.emotional_hook}`,
        "",
        "What would help you most next?",
        "",
        "A) Beginner checklist",
        "B) Step-by-step walkthrough",
        "C) Common mistakes",
        "D) Full project breakdown",
      ].join("\n");
    case "STORY":
      return [
        `Frame 1: ${brief.emotional_hook} | Big text on screen.`,
        `Frame 2: ${brief.transformation.before} | Show the problem.`,
        `Frame 3: ${brief.core_insight} | Show the shift.`,
        `Frame 4: ${brief.supporting_points[0]} | Add a simple visual.`,
        "Frame 5: Save this | Add a poll sticker.",
      ].join("\n");
  }
}

function briefFromSummary(summary?: SourceSummary, transcript = ""): ContentBrief {
  if (!summary) return createFallbackBriefFromTranscript(transcript);
  return {
    core_insight: summary.tldr,
    supporting_points: summary.takeaways.slice(0, 5),
    emotional_hook: summary.hooks[0] ?? summary.tldr,
    audience: summary.targetAudience,
    transformation: {
      before: "The audience feels stuck or confused about the topic.",
      after: summary.takeaways[0] ?? "The audience understands the next practical step.",
    },
    tone: summary.detectedTone === "controversial" ? "contrarian" : summary.detectedTone === "news" ? "educational" : summary.detectedTone,
    strongest_quote: summary.hooks[1] ?? summary.tldr,
  };
}

function createFallbackBriefFromTranscript(transcript: string): ContentBrief {
  const firstLine = cleanupPost(transcript.split(/\n+/).find((line) => line.trim().length > 20) ?? fallbackBrief.core_insight);
  return {
    ...fallbackBrief,
    core_insight: firstLine.slice(0, 240),
    emotional_hook: firstLine.slice(0, 160),
    strongest_quote: firstLine.slice(0, 180),
  };
}

function sourceSummaryFromBrief(brief: ContentBrief): SourceSummary {
  return {
    tldr: brief.core_insight,
    takeaways: padToLength(brief.supporting_points, 5, brief.core_insight),
    hooks: padToLength([
      brief.emotional_hook,
      brief.strongest_quote,
      `Before: ${brief.transformation.before}`,
      `After: ${brief.transformation.after}`,
      ...brief.supporting_points,
    ], 10, brief.core_insight),
    detectedTone: brief.tone === "contrarian" ? "controversial" : brief.tone,
    topics: ["source insight", "practical lesson", "content idea"],
    targetAudience: brief.audience,
  };
}

function padToLength(values: string[], length: number, fallback: string) {
  const output = values.filter(Boolean);
  while (output.length < length) output.push(fallback);
  return output.slice(0, length);
}

function summaryToText(summary?: SourceSummary) {
  if (!summary) return "";
  return [
    summary.tldr,
    ...summary.takeaways,
    ...summary.hooks,
    summary.topics.join(", "),
    summary.targetAudience,
  ].join("\n");
}

function parseJson(value: string) {
  return JSON.parse(value.replace(/```json|```/g, "").trim());
}

function cleanupPost(value: string) {
  return value
    .replace(/^```[a-z]*\s*/i, "")
    .replace(/```$/i, "")
    .replace(/^\s*(output|post|caption|thread|script)\s*:\s*/i, "")
    .trim();
}

function truncateWords(value: string, words: number) {
  return value.split(/\s+/).slice(0, words).join(" ");
}
