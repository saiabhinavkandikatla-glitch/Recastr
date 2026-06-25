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
  "gets easier when you stop treating it like magic",
  "most beginners get stuck because",
  "most beginners do not get stuck because",
  "the hard part was not the technology",
  "it was missing the mental model",
  "you do not need to understand the whole kitchen",
  "you just need to know the menu",
  "think of it like ordering food",
  "think of it like ordering at a restaurant",
];

export function extractBriefPrompt(transcript: string, title: string) {
  return `You are a content strategist. Extract key elements from the SOURCE CONTENT transcript ONLY. Never fabricate or use the title as a substitute for content.

CRITICAL RULES:
1. All fields MUST be traced to specific details in the transcript
2. Never use generic statements that could apply to any title
3. Each insight must reference actual quotes, examples, or specific points from the source
4. If the transcript is too short or generic to extract real insights, return null values

SOURCE TITLE: ${title}
SOURCE CONTENT TRANSCRIPT:
${transcript}

Return ONLY this JSON. No explanation, no markdown fences:
{
  "core_promise": "the single biggest benefit mentioned or demonstrated (1 sentence, traceable to transcript)",
  "pain_point": "specific problem the audience struggles with (must reference transcript detail, not generic)",
  "key_steps": ["specific step 1 from content", "specific step 2 from content", "specific step 3 from content"],
  "hook_angle": "most surprising or counterintuitive statement actually in the transcript",
  "target_audience": "who this is for based on content context (5 words)",
  "cta": "what the creator wants viewers to do next (explicit or implied in transcript)",
  "specific_detail": "one concrete fact, quote, or example from the transcript that proves this is real content"
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

function factsContext(brief: GenerationBrief) {
  return `CORE PROMISE: ${brief.core_promise}
PAIN POINT: ${brief.pain_point}
HOOK ANGLE: ${brief.hook_angle}
KEY POINTS: ${brief.key_steps.join(" | ")}
AUDIENCE: ${brief.target_audience}
CTA: ${brief.cta}
SPECIFIC DETAIL: ${brief.specific_detail}`;
}

export function writeTwitterThreadPrompt(brief: GenerationBrief, title: string) {
  return `Write an expert X/Twitter thread.

${factsContext(brief)}
TITLE (for context only): ${title}

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
8. DO NOT use the title as content in any tweet.
9. DO NOT wrap the title in quotes as content.
10. DO NOT start tweets with "In the video..." or similar title-dependent phrases.
11. ALWAYS write as if you watched the video. Reference specific things from the facts above.

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

${factsContext(brief)}
TITLE (for context only): ${title}

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
8. DO NOT use the title as content in the post.
9. DO NOT wrap the title in quotes as content.
10. Always write as if you watched the video. Reference specific things from the facts above.

OUTPUT ONLY THE POST TEXT. NO PREAMBLE. NO OTHER LABELS.`;
}

export function writeInstagramCaptionPrompt(brief: GenerationBrief, title: string) {
  return `Write an Instagram caption.

${factsContext(brief)}
TITLE (for context only): ${title}

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
9. DO NOT use the title as content in the caption.
10. DO NOT wrap the title in quotes as content.
11. Always write as if you watched the video. Reference specific things from the facts above.

OUTPUT ONLY THE CAPTION. NO PREAMBLE.`;
}

export function writeInstagramCarouselPrompt(brief: GenerationBrief, title: string) {
  return `Write an Instagram carousel (5 slides).

${factsContext(brief)}
TITLE (for context only): ${title}

RULES:
- Slide 1: Hook headline + subline
- Slides 2-4: Problem → Steps → Insight (one headline + 2-3 bullets each, using → instead of bullets)
- Slide 5: CTA
- Format each slide exactly as:

SLIDE N: [Headline]
→ bullet 1
→ bullet 2

Separate slides with ---

OUTPUT ONLY THE SLIDES. NO PREAMBLE.

ADDITIONAL RULES:
- DO NOT use the title as content in any slide.
- DO NOT wrap the title in quotes as content.
- Always write as if you watched the video. Reference specific things from the facts above.`;
}

export function writeFacebookPostPrompt(brief: GenerationBrief, title: string) {
  return `Write a Facebook post.

${factsContext(brief)}
TITLE (for context only): ${title}

RULES:
- Conversational, story-driven, 80-180 words
- End with a specific question CTA
- No hashtags unless essential (max 2)

BANNED: "Delve", "In conclusion", "It's important to note", "Game-changing",
"In today's world", "I hope this helps", "Synergy", "Leverage"

ADDITIONAL RULES:
- DO NOT use the title as content in the post.
- DO NOT wrap the title in quotes as content.
- Always write as if you watched the video. Reference specific things from the facts above.

OUTPUT ONLY THE POST. NO PREAMBLE. NO OTHER LABELS.`;
}

export function writeYouTubeCommunityPrompt(brief: GenerationBrief, title: string) {
  return `Write a YouTube Community post.

${factsContext(brief)}
TITLE (for context only): ${title}

RULES:
- Short, direct update or poll question
- If poll: include 4 answer options labeled A) B) C) D)
- 40-120 words

ADDITIONAL RULES:
- DO NOT use the title as content in the post.
- DO NOT wrap the title in quotes as content.
- Always write as if you watched the video. Reference specific things from the facts above.

OUTPUT ONLY THE POST. NO PREAMBLE. NO OTHER LABELS.`;
}

export function writeReelScriptPrompt(brief: GenerationBrief, title: string) {
  return `Write a Reel / Short video script (spoken word).

${factsContext(brief)}
TITLE (for context only): ${title}

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

ADDITIONAL RULES:
- DO NOT use the title as content in the script.
- DO NOT wrap the title in quotes as content.
- Always write as if you watched the video. Reference specific things from the facts above.

OUTPUT ONLY THE SCRIPT. NO PREAMBLE. NO OTHER LABELS.`;
}

export function writeThreadsPrompt(brief: GenerationBrief, title: string) {
  return `Write a Threads post sequence (4-5 posts).

${factsContext(brief)}
TITLE (for context only): ${title}

RULES:
- Short conversational posts, one idea each
- Separate posts with ---
- End with a reply-friendly question

ADDITIONAL RULES:
- DO NOT use the title as content in any post.
- DO NOT wrap the title in quotes as content.
- Always write as if you watched the video. Reference specific things from the facts above.

OUTPUT ONLY THE POSTS. NO PREAMBLE. NO OTHER LABELS.`;
}

export function writeHooksPrompt(brief: GenerationBrief, title: string) {
  return `Write 10 viral hook lines for this topic.

${factsContext(brief)}
TITLE (for context only): ${title}

RULES:
- Mix: curiosity gap, contrarian, question, personal story
- One hook per line, separated by ---
- No numbering, no "Hook 1:" labels

ADDITIONAL RULES:
- DO NOT use the title as content in any hook.
- DO NOT wrap the title in quotes as content.
- Always write as if you watched the video. Reference specific things from the facts above.

OUTPUT ONLY THE HOOKS. NO PREAMBLE. NO OTHER LABELS.`;
}

export function writeCtaPrompt(brief: GenerationBrief, title: string) {
  return `Write 4 distinct call-to-action lines.

${factsContext(brief)}
TITLE (for context only): ${title}

RULES:
- 1 engagement CTA, 1 lead magnet CTA, 1 sales CTA, 1 newsletter CTA
- Separate with ---
- No labels

ADDITIONAL RULES:
- DO NOT use the title as content in any CTA line.
- DO NOT wrap the title in quotes as content.
- Always write as if you watched the video. Reference specific things from the facts above.

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
