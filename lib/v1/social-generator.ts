import { generateAIText } from "@/lib/ai/client";
import type { Platform, SocialOutput, Tone } from "@/lib/types";

type GenerateV1Options = {
  projectId: string;
  sourceDocument: string;
  platforms: Platform[];
  tone: Tone | string;
  transcriptAvailable: boolean;
  isRegeneration?: boolean;
  previousDrafts?: string[];
};

type GeneratedPostsPayload = {
  posts?: Partial<Record<Platform, string[]>>;
};

const PLATFORM_LABELS: Partial<Record<Platform, string>> = {
  LINKEDIN: "LinkedIn",
  TWITTER: "Twitter/X",
  INSTAGRAM: "Instagram Caption",
  THREADS: "Threads",
  FACEBOOK: "Facebook",
  COMMUNITY: "YouTube Community",
  CAROUSEL: "Instagram Carousel",
};

const SUPPORTED_PLATFORMS: Platform[] = [
  "LINKEDIN",
  "TWITTER",
  "INSTAGRAM",
  "THREADS",
  "FACEBOOK",
  "COMMUNITY",
  "CAROUSEL",
];

const FORBIDDEN_OPENERS = [
  "in this video",
  "the creator says",
  "this transcript",
  "this video explains",
  "according to the video",
  "have you ever wondered",
  "in today's world",
  "here are",
  "let's dive into",
  "it is important to",
  "unlock the power",
];

const MODE_STRATEGIES: Record<string, string> = {
  professional: `Professional strategy:
- Lead with a clear business observation.
- Use concise, authoritative paragraphs.
- Prioritize practical implications and decision-making.
- Avoid slang, jokes, hype, and emotional narration.`,
  casual: `Casual strategy:
- Sound like a smart creator talking to a friend.
- Use relaxed everyday language and contractions.
- Keep the rhythm easy, conversational, and low-pressure.
- Make the insight feel discovered, not announced.`,
  educational: `Educational strategy:
- Teach one useful idea clearly.
- Explain why it matters and how to apply it.
- Use a simple framework, sequence, or practical example when possible.
- Make the reader leave with a usable takeaway.`,
  entertainment: `Entertainment strategy:
- Lead with curiosity, surprise, or a playful observation.
- Keep energy high without inventing jokes or facts.
- Use vivid phrasing and tension.
- Make the reader want to keep scrolling because the angle is fun.`,
  entertaining: `Entertainment strategy:
- Lead with curiosity, surprise, or a playful observation.
- Keep energy high without inventing jokes or facts.
- Use vivid phrasing and tension.
- Make the reader want to keep scrolling because the angle is fun.`,
  founder: `Founder strategy:
- Frame the idea through tradeoffs, constraints, leadership, or first-principles thinking.
- Sound like someone building in public.
- Include the cost, lesson, or decision behind the insight.
- Avoid polished PR language.`,
  storytelling: `Storytelling strategy:
- Open with a moment, scene, conflict, or turning point.
- Build tension before the lesson.
- Use narrative paragraphs instead of lists.
- End with an insight that feels earned.`,
  "personal brand": `Personal Brand strategy:
- Write from a reflective first-person point of view.
- Make the author sound authentic, specific, and opinionated.
- Connect the source idea to a broader personal lesson.
- Prioritize voice and perspective over generic advice.`,
  personal_brand: `Personal Brand strategy:
- Write from a reflective first-person point of view.
- Make the author sound authentic, specific, and opinionated.
- Connect the source idea to a broader personal lesson.
- Prioritize voice and perspective over generic advice.`,
  viral: `Viral strategy:
- Start with a strong, specific hook.
- Use short paragraphs and a curiosity gap.
- Change the angle, structure, and CTA aggressively.
- Make the post easy to save, reply to, or share without sounding like clickbait.`,
};

export async function generateV1SocialOutputs({
  projectId,
  sourceDocument,
  platforms,
  tone,
  transcriptAvailable,
  isRegeneration = false,
  previousDrafts = [],
}: GenerateV1Options): Promise<SocialOutput[]> {
  const selectedPlatforms = platforms.filter((platform) => SUPPORTED_PLATFORMS.includes(platform));
  if (selectedPlatforms.length === 0) return [];

  const raw = await generateAIText({
    prompt: buildMasterPrompt({
      sourceDocument,
      platforms: selectedPlatforms,
      tone,
      transcriptAvailable,
      isRegeneration,
      previousDrafts,
    }),
    responseMimeType: "application/json",
    temperature: isRegeneration ? 0.92 : 0.74,
    maxOutputTokens: 4000,
  });
  const payload = parseGeneratedPosts(raw);
  const now = new Date().toISOString();
  const outputs: SocialOutput[] = [];

  selectedPlatforms.forEach((platform, index) => {
    const drafts = payload.posts?.[platform];
    const draftList = Array.isArray(drafts) ? drafts : (drafts ? [drafts] : []);
    
    let targetCount = 1;
    if (platform === "TWITTER") targetCount = 3;
    else if (platform === "LINKEDIN") targetCount = 2;
    else if (platform === "FACEBOOK") targetCount = 2;
    else if (platform === "INSTAGRAM") targetCount = 2;
    else if (platform === "CAROUSEL") targetCount = 2;
    else if (platform === "THREADS") targetCount = 2;
    else if (platform === "COMMUNITY") targetCount = 2;

    for (let i = 0; i < targetCount; i++) {
      const generated = draftList[i]?.trim();
      const content = cleanGeneratedPost(
        generated || fallbackPost(platform, transcriptAvailable, i + 1),
        previousDrafts
      );
      
      const label = PLATFORM_LABELS[platform] ?? platform;
      const countLabel = targetCount > 1 ? `${label} - Draft ${i + 1}` : label;

      outputs.push({
        id: `${projectId}-v1-${platform.toLowerCase()}-${i + 1}-${Date.now()}-${index}`,
        projectId,
        platform,
        outputType: countLabel,
        content,
        originalContent: content,
        tone,
        approved: false,
        createdAt: now,
      });
    }
  });

  return outputs;
}

function buildMasterPrompt({
  sourceDocument,
  platforms,
  tone,
  transcriptAvailable,
  isRegeneration,
  previousDrafts,
}: {
  sourceDocument: string;
  platforms: Platform[];
  tone: Tone | string;
  transcriptAvailable: boolean;
  isRegeneration: boolean;
  previousDrafts: string[];
}) {
  const platformLines = platforms
    .map((platform) => `- ${platform}: ${PLATFORM_LABELS[platform]}`)
    .join("\n");

  const normalizedTone = normalizeTone(tone);
  const modeStrategy = MODE_STRATEGIES[normalizedTone] ?? MODE_STRATEGIES.professional;
  const variationSeed = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const previousBlock = previousDrafts.length
    ? `Previous drafts to avoid. Do not reuse their hooks, openings, paragraph structure, or CTA:\n${previousDrafts
        .slice(0, 8)
        .map((draft, index) => `DRAFT ${index + 1}:\n${draft.slice(0, 1200)}`)
        .join("\n\n")}`
    : "No previous drafts were supplied.";

  return `You are an experienced human social media copywriter.

Your job is to read one YouTube source document and write publishable social posts.

First understand the source document:
- What is this actually about?
- Who is it for?
- What is the biggest lesson?
- What would surprise readers?
- What advice is actionable?
- What story or moment is memorable?

Then write independently for each requested platform. You must generate multiple high-quality drafts for each platform as requested below:

Draft requirements per platform:
- TWITTER: 3 drafts (Each draft must be a unique post or a thread. Vary the hook, writing style, CTA, structure, and length. Limit to 280 characters per tweet, or format as a thread with numbered tweets like 1/, 2/ if longer).
- LINKEDIN: 2 drafts (Each draft must be a professional post. Vary the opening line, style, and structure. One should be shorter and punchy, the other a longer, more structured insight).
- FACEBOOK: 2 drafts (Each draft must be a highly engaging post. Different hook, opening, and CTA).
- INSTAGRAM: 2 drafts (Instagram captions. Different hook, paragraph structure, and CTA. Include appropriate hashtags).
- CAROUSEL: 2 drafts (Instagram carousel scripts. Format each script inside a "Story sequence" section containing 5 slides: Slide 1: [Hook], Slide 2: [Value], Slide 3: [Value], Slide 4: [Value], Slide 5: [CTA]).
- THREADS: 2 drafts (Each draft must be different: hook, opening, structure).
- COMMUNITY: 2 drafts (YouTube community posts. Different hooks and CTAs).

Every single draft for a platform MUST be completely different in hook, CTA, writing style, structure, opening, and ending. They must NOT just be reworded versions of each other.

Hard rules:
- Never start with the video title.
- Never repeat the title as a hook.
- Never say "In this video", "The creator says", "This transcript", "This video explains", or "According to the video".
- Never sound like a summary, notes, or an AI assistant.
- Never invent facts. Use only the source document.
- If the transcript is unavailable, rely only on metadata and description and be more conservative.
- Do not reuse the same wording across platforms.
- Do not produce random bullet lists.
- Make every post specific, concrete, readable, and ready to publish.
- Never start with: "Have you ever wondered", "In today's world", "Here are", "Let's dive into", "It is important to", or "Unlock the power".

Preferred writing shape:
Observation -> Story or context -> Insight -> Lesson -> Reflection -> optional CTA.

Tone preference: ${tone}
${modeStrategy}

${isRegeneration ? "This is a regeneration. Produce genuinely new drafts: new hooks, new angles, new structures, new CTAs. Keep the same facts and meaning." : ""}
Variation seed: ${variationSeed}
Transcript available: ${transcriptAvailable ? "yes" : "no"}

${previousBlock}

Requested platforms:
${platformLines}

Return only valid JSON in this exact shape:
{
  "posts": {
    "TWITTER": [
      "Tweet 1 text...",
      "Tweet 2 text...",
      "Tweet 3 text..."
    ],
    "LINKEDIN": [
      "LinkedIn Post 1...",
      "LinkedIn Post 2..."
    ],
    "FACEBOOK": [
      "Facebook Post 1...",
      "Facebook Post 2..."
    ],
    "INSTAGRAM": [
      "Instagram Caption 1...",
      "Instagram Caption 2..."
    ],
    "CAROUSEL": [
      "Story sequence\\nSlide 1: Slide title\\nSlide 2: content...\\nSlide 3: content...\\nSlide 4: content...\\nSlide 5: CTA",
      "Story sequence\\nSlide 1: Slide title\\nSlide 2: content...\\nSlide 3: content...\\nSlide 4: content...\\nSlide 5: CTA"
    ],
    "THREADS": [
      "Threads post 1...",
      "Threads post 2..."
    ],
    "COMMUNITY": [
      "YouTube Community post 1...",
      "YouTube Community post 2..."
    ]
  }
}

Only include keys for requested platforms. If a platform is requested, you must return the exact number of drafts specified in the draft requirements.

SOURCE DOCUMENT:
${sourceDocument}`;
}

function parseGeneratedPosts(raw: string): GeneratedPostsPayload {
  const direct = tryParseJson(raw);
  if (direct) return direct;

  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const fromFence = fenced ? tryParseJson(fenced) : null;
  if (fromFence) return fromFence;

  const objectMatch = raw.match(/\{[\s\S]*\}/);
  const fromObject = objectMatch ? tryParseJson(objectMatch[0]) : null;
  return fromObject ?? { posts: {} };
}

function tryParseJson(value: string): GeneratedPostsPayload | null {
  try {
    const parsed = JSON.parse(value) as GeneratedPostsPayload;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function cleanGeneratedPost(value: string, previousDrafts: string[]) {
  const cleaned = value
    .replace(/^["']|["']$/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const lower = cleaned.toLowerCase();
  const badOpener = FORBIDDEN_OPENERS.find((phrase) => lower.startsWith(phrase));
  if (!badOpener) return cleaned;

  const withoutBadOpener = cleaned
    .split(/\n+/)
    .slice(1)
    .join("\n")
    .trim() || cleaned.replace(new RegExp(`^${escapeRegExp(badOpener)}[:,.\\s-]*`, "i"), "").trim();

  if (previousDrafts.some((draft) => normalizeForComparison(draft) === normalizeForComparison(withoutBadOpener))) {
    return `${withoutBadOpener}\n\nWhat changes when you look at it this way?`;
  }

  return withoutBadOpener;
}

function fallbackPost(platform: Platform, transcriptAvailable: boolean, draftIndex: number) {
  const sourceLimit = transcriptAvailable
    ? "The source has a transcript, but generation returned an empty draft."
    : "The transcript was unavailable, so this draft should be treated as a conservative starting point.";

  if (platform === "COMMUNITY") {
    return `[Draft ${draftIndex}] ${sourceLimit}\n\nWhat part of this topic would you want expanded next?`;
  }

  return `[Draft ${draftIndex}] ${sourceLimit}\n\nReview the source details, then rewrite this draft with a specific observation, a useful lesson, and a natural takeaway for ${platform}.`;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeTone(tone: Tone | string) {
  return String(tone).trim().toLowerCase().replace(/-/g, " ").replace(/_/g, " ");
}

function normalizeForComparison(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}
