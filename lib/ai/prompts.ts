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
  return `Write an expert X/Twitter thread.

${briefContext(brief, title)}

RULES:
1. Thread format — every tweet is numbered:
   1/ [Hook — the most surprising fact, surprising number, or counter-intuitive claim]
   2/ [First point]
   ...
   X/ [Summary + follow CTA]
2. EVERY TWEET must be under 280 characters (count carefully).
3. Tweet 1 (the hook) formula: State surprising number/outcome, tell how briefly, end with a thread emoji 🧵. Make it stop-scroll quality.
4. Body tweets: One insight/framework per tweet. Use concrete numbers. Short punchy sentences.
5. Final tweet: Summarize the core lesson, then say "Follow @[handle] for more".
6. Length: 5-8 tweets.
7. Banned words: "delve", "in conclusion", "it's important to note", "game-changing", "in today's world", "synergy", "leverage".

FORMAT — EXACTLY THIS:
1/ [Tweet 1 content]
---
2/ [Tweet 2 content]
---
3/ [Tweet 3 content]

OUTPUT ONLY THE THREAD. NO PREAMBLE. NO OTHER LABELS.`;
}

export function writeLinkedInPostPrompt(brief: GenerationBrief, title: string) {
  return `Write an expert LinkedIn post.

${briefContext(brief, title)}

RULES:
1. FIRST LINE is everything: under 10 words, creates curiosity or tension.
2. Structure:
   [Hook line — 1 sentence, max 10 words]
   
   [Context — 1-2 sentences max]
   
   [Body — use em dashes (—) as section breaks, short paragraphs of 1-3 lines]
   
   [The lesson — your sharpest insight from the content]
   
   [CTA — a self-reflective question OR a repost ask (♻️ Repost if you agree), never both]
3. Focus on the BUSINESS MODEL or PROFESSIONAL LESSON, not the personal story.
4. Use specific numbers. Do not say "grew a lot" when you have specific stats.
5. NO HASHTAGS ON LINKEDIN AT ALL.
6. Length: 150-300 words. Never exceed 400 words.
7. Banned words: "delve", "in conclusion", "it's important to note", "game-changing", "in today's world", "synergy", "leverage".

OUTPUT ONLY THE POST TEXT. NO PREAMBLE. NO OTHER LABELS.`;
}

export function writeInstagramCaptionPrompt(brief: GenerationBrief, title: string) {
  return `Write an Instagram caption.

${briefContext(brief, title)}

RULES:
1. FIRST TWO LINES are what users see before "...more".
   - Line 1: Hook — number, question, or bold claim. NEVER start with "I" as the first word.
   - Line 2: Create curiosity.
2. Line breaks after every 1-3 sentences.
3. Use arrows (→) for lists.
4. Emojis: 1-3 maximum at natural pause points.
5. Save CTA: end the body with "Save this if [reason]" or "Share this with [someone who needs it]".
6. Lead with the PERSONAL JOURNEY (emotional arc).
7. Hashtags: 5-8 hashtags at the very end after 2 blank lines (no inline hashtags).
8. Banned words: "delve", "in conclusion", "it's important to note", "game-changing", "in today's world", "synergy", "leverage".

OUTPUT ONLY THE CAPTION. NO PREAMBLE.`;
}

export function writeInstagramCarouselPrompt(brief: GenerationBrief, title: string) {
  return `Write an Instagram carousel (5 slides).

${briefContext(brief, title)}

RULES:
- Slide 1: Hook headline + subline
- Slides 2-4: Problem → Steps → Insight (one headline + 2-3 bullets each, using → instead of bullets)
- Slide 5: CTA
- Format each slide exactly as:

SLIDE N: [Headline]
→ bullet 1
→ bullet 2

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
1. Structure with timestamps:
   [HOOK — 0 to 3 sec]
   [lines]
   
   [CONTEXT — 3 to 8 sec]
   [lines]
   
   [POINT 1 — 8 to 20 sec]
   [lines]
   
   [POINT 2 — 20 to 32 sec]
   [lines]
   
   [POINT 3 — 32 to 45 sec]
   [lines]
   
   [CTA — 45 to 55 sec]
   [lines]
2. HOOK (first 3 seconds): State surprising number/outcome, question, or bold claim.
3. Sentence length: max 10 words per sentence.
4. Natural speech: use contractions ("didn't" instead of "did not"). Mark pauses with "...".
5. Include [TEXT: "key stat"] overlay cues and [B-ROLL: description] cues.
6. CTA: last 5-10 seconds, focus on what they get by following.
7. Length: 45-60 seconds (~100-130 words).
8. Banned words: "delve", "in conclusion", "it's important to note", "game-changing", "in today's world", "synergy", "leverage".

OUTPUT ONLY THE SCRIPT. NO PREAMBLE. NO OTHER LABELS.`;
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
