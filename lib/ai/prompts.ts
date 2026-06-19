import type { GenerationBrief } from "@/lib/ai/brief";
import type { Platform } from "@/lib/types";

/** System prompt on every platform generation call — never buried in user prompt. */
export const CONTENT_WRITER_SYSTEM_PROMPT = `You are a professional social media content writer. You write ONLY the requested content. You never explain, analyze, or add commentary. You never start with "Here is..." or "Sure!" or "I've created...". You output ONLY the content itself, exactly in the format requested.`;

export const BANNED_PHRASES = [
  "delve",
  "in conclusion",
  "it's important to note",
  "it is important to note",
  "game-changing",
  "in today's world",
  "i hope this helps",
  "synergy",
  "leverage",
  "here is",
  "sure!",
  "i've created",
  "transformative",
  "landscape",
  "testament",
  "revolutionize",
  "turn the strongest idea",
  "platform-native content pack",
  "recastr",
];

export function extractBriefPrompt(transcript: string, title: string) {
  return `You are a content strategist. Extract key elements from this source.

SOURCE TITLE: ${title}
SOURCE CONTENT: ${transcript}

Return ONLY this JSON. No explanation, no markdown fences:
{
  "core_promise": "the single biggest benefit in 1 sentence",
  "pain_point": "what the audience struggles with before this",
  "key_steps": ["insight 1", "insight 2", "insight 3"],
  "hook_angle": "the most surprising or counterintuitive thing here",
  "target_audience": "who this is for, in 5 words",
  "cta": "what the creator wants viewers to do next"
}`;
}

function briefContext(brief: GenerationBrief, title: string) {
  return `TOPIC: ${title}
CORE PROMISE: ${brief.core_promise}
PAIN POINT: ${brief.pain_point}
HOOK ANGLE: ${brief.hook_angle}
KEY POINTS: ${brief.key_steps.join(" | ")}
AUDIENCE: ${brief.target_audience}
CTA: ${brief.cta}`;
}

export function writeTwitterThreadPrompt(brief: GenerationBrief, title: string) {
  return `Write a Twitter/X thread.

${briefContext(brief, title)}

RULES:
- Tweet 1: bold hook under 220 chars. Stop-scroll quality.
- Tweets 2-7: one idea per tweet, numbered "1/", "2/" etc, max 2 lines
- Last tweet: clear CTA
- 6-8 tweets total, human voice, no corporate language

BANNED: "Delve", "In conclusion", "It's important to note", "Game-changing",
"In today's world", "I hope this helps", "Synergy", "Leverage"

FORMAT — EXACTLY THIS:
TWEET_1: [content]
---
TWEET_2: 1/ [content]
---
[continue to TWEET_7 or 8]

OUTPUT ONLY THE TWEETS. NO PREAMBLE. NO LABELS BEYOND THE FORMAT ABOVE.`;
}

export function writeLinkedInPostPrompt(brief: GenerationBrief, title: string) {
  return `Write a LinkedIn post.

${briefContext(brief, title)}

RULES:
- Personal story or lesson format, 150-220 words
- Short single-sentence paragraphs (broetry style)
- Numbered list of 3-5 insights
- 3-5 relevant hashtags at the end
- Human voice, first person when natural

BANNED: "Delve", "In conclusion", "It's important to note", "Game-changing",
"In today's world", "I hope this helps", "Synergy", "Leverage"

OUTPUT ONLY THE POST TEXT. NO PREAMBLE. NO LABELS.`;
}

export function writeInstagramCaptionPrompt(brief: GenerationBrief, title: string) {
  return `Write an Instagram caption.

${briefContext(brief, title)}

RULES:
- Hook line under 125 characters
- Arrow list (→) for 3-4 key points
- 10-15 hashtags on final line
- Conversational, high energy

BANNED: "Delve", "In conclusion", "It's important to note", "Game-changing",
"In today's world", "I hope this helps", "Synergy", "Leverage"

OUTPUT ONLY THE CAPTION. NO PREAMBLE.`;
}

export function writeInstagramCarouselPrompt(brief: GenerationBrief, title: string) {
  return `Write an Instagram carousel (5 slides).

${briefContext(brief, title)}

RULES:
- Slide 1: Hook headline + subline
- Slides 2-4: Problem → Steps → Insight (one headline + 2-3 bullets each)
- Slide 5: CTA
- Format each slide exactly as:

SLIDE N: [Headline]
- bullet 1
- bullet 2

Separate slides with ---

OUTPUT ONLY THE SLIDES. NO PREAMBLE.`;
}

export function writeFacebookPostPrompt(brief: GenerationBrief, title: string) {
  return `Write a Facebook post.

${briefContext(brief, title)}

RULES:
- Conversational, story-driven, 80-180 words
- End with a specific question CTA
- No hashtags unless essential (max 2)

BANNED: "Delve", "In conclusion", "It's important to note", "Game-changing",
"In today's world", "I hope this helps", "Synergy", "Leverage"

OUTPUT ONLY THE POST. NO PREAMBLE.`;
}

export function writeYouTubeCommunityPrompt(brief: GenerationBrief, title: string) {
  return `Write a YouTube Community post.

${briefContext(brief, title)}

RULES:
- Short, direct update or poll question
- If poll: include 4 answer options labeled A) B) C) D)
- 40-120 words

OUTPUT ONLY THE POST. NO PREAMBLE.`;
}

export function writeReelScriptPrompt(brief: GenerationBrief, title: string) {
  return `Write a Reel / Short video script (spoken word).

${briefContext(brief, title)}

RULES:
- [HOOK — 0 to 3 sec]: one punchy line
- [BODY — 3 to 40 sec]: 2-3 short spoken beats
- [CTA — 40 to 60 sec]: one clear action
- 80-100 words total, written to be spoken aloud

FORMAT:
[HOOK — 0 to 3 sec]
[line]

[BODY — 3 to 40 sec]
[lines]

[CTA — 40 to 60 sec]
[line]

OUTPUT ONLY THE SCRIPT. NO PREAMBLE.`;
}

export function writeThreadsPrompt(brief: GenerationBrief, title: string) {
  return `Write a Threads post sequence (4-5 posts).

${briefContext(brief, title)}

RULES:
- Short conversational posts, one idea each
- Separate posts with ---
- End with a reply-friendly question

OUTPUT ONLY THE POSTS. NO PREAMBLE.`;
}

export function writeHooksPrompt(brief: GenerationBrief, title: string) {
  return `Write 10 viral hook lines for this topic.

${briefContext(brief, title)}

RULES:
- Mix: curiosity gap, contrarian, question, personal story
- One hook per line, separated by ---
- No numbering, no "Hook 1:" labels

OUTPUT ONLY THE HOOKS. NO PREAMBLE.`;
}

export function writeCtaPrompt(brief: GenerationBrief, title: string) {
  return `Write 4 distinct call-to-action lines.

${briefContext(brief, title)}

RULES:
- 1 engagement CTA, 1 lead magnet CTA, 1 sales CTA, 1 newsletter CTA
- Separate with ---
- No labels

OUTPUT ONLY THE CTAs. NO PREAMBLE.`;
}

export function platformWriterPrompt(platform: Platform, brief: GenerationBrief, title: string) {
  switch (platform) {
    case "TWITTER":
      return writeTwitterThreadPrompt(brief, title);
    case "LINKEDIN":
      return writeLinkedInPostPrompt(brief, title);
    case "INSTAGRAM":
      return writeInstagramCaptionPrompt(brief, title);
    case "CAROUSEL":
      return writeInstagramCarouselPrompt(brief, title);
    case "FACEBOOK":
      return writeFacebookPostPrompt(brief, title);
    case "COMMUNITY":
      return writeYouTubeCommunityPrompt(brief, title);
    case "STORY":
      return writeReelScriptPrompt(brief, title);
    case "THREADS":
      return writeThreadsPrompt(brief, title);
    case "HOOKS":
      return writeHooksPrompt(brief, title);
    case "CTA":
      return writeCtaPrompt(brief, title);
  }
}
