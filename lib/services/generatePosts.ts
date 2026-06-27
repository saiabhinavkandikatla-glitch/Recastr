import { generateAIText, getAIClient } from "@/lib/ai/client";

export interface GenerationInsights {
  main_topics: string[];
  interesting_moments: string[];
  surprising_facts: string[];
  quotes: string[];
  stories: string[];
  contrarian_opinions: string[];
  lessons: string[];
  actionable_advice: string[];
  statistics: string[];
  emotional_moments: string[];
  curiosity_hooks: string[];
}

const TONE_INSTRUCTIONS: Record<string, string> = {
  professional: 'Polished, confident, no slang. Sentence-level clarity. Suitable for a LinkedIn executive audience.',
  casual: 'Relaxed, conversational, like texting a friend. Contractions okay. Short sentences.',
  storytelling: 'Narrative arc — setup, tension, payoff. First person where natural. Paint a scene.',
  viral: 'Bold claims, pattern interrupts, strong hooks. Built to stop a scroll in the first line.',
  educational: 'Clear, structured, teaches a concept step by step. Assume the reader knows nothing yet.',
  founder: 'Direct, opinionated, slightly contrarian. Speaks from lived experience building something.',
  personal_brand: 'Personal, vulnerable, first-person reflection. Connects the insight to a bigger life lesson.',
};

const BANNED_PHRASES = [
  'most people',
  'nobody talks about',
  "here's the thing",
  'the truth is',
  'game changer',
  'in conclusion',
  "it's important to note",
  'delve',
  'unlock the power of',
  'in today\'s world',
];

/**
 * Picks a random element from an array.
 */
function pickOne<T>(arr: T[]): T | null {
  if (!arr || arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generic helper that logs/validates LLM prompts and handles calls.
 */
async function generatePostWithAI(
  platform: string,
  prompt: string,
  insights: GenerationInsights,
  transcriptLength: number
) {
  const aiClient = getAIClient();
  if (!aiClient) {
    throw new Error("OpenAI API client not configured.");
  }

  // Calculate fact count
  const factCount = 
    (insights.main_topics?.length ?? 0) +
    (insights.interesting_moments?.length ?? 0) +
    (insights.surprising_facts?.length ?? 0) +
    (insights.quotes?.length ?? 0) +
    (insights.stories?.length ?? 0) +
    (insights.contrarian_opinions?.length ?? 0) +
    (insights.lessons?.length ?? 0) +
    (insights.actionable_advice?.length ?? 0) +
    (insights.statistics?.length ?? 0) +
    (insights.emotional_moments?.length ?? 0) +
    (insights.curiosity_hooks?.length ?? 0);

  // Print exact prompt and details
  console.log(`[GENERATION] Generating post for platform: ${platform}`);
  console.log("======================================== LLM PROMPT ========================================");
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

  const text = await generateAIText({
    model: "gpt-5.4-mini",
    prompt,
  });

  return text.trim();
}

/**
 * Generates a single Twitter/X post.
 */
export async function generateTwitterPost(insights: GenerationInsights, tone: string, transcriptLength = 0) {
  const toneKey = tone.toLowerCase().replace(/ /g, '_');
  const toneInstruction = TONE_INSTRUCTIONS[toneKey] || TONE_INSTRUCTIONS.casual;
  const hook = pickOne(insights.curiosity_hooks) || pickOne(insights.surprising_facts);

  if (!hook) {
    throw new Error("Cannot generate Twitter post: No curiosity hooks or surprising facts available in extracted insights.");
  }

  const prompt = `
Write a single Twitter/X post based on this real insight from a video:

INSIGHT TO USE: ${hook}
SUPPORTING CONTEXT: ${insights.main_topics.join(', ')}

TONE: ${toneInstruction}

RULES:
- Sound like a real person who actually watched this, not an AI summarizing it
- Max 280 characters
- Do not start with any of these banned phrases: ${BANNED_PHRASES.join(', ')}
- No hashtag stuffing — 0-2 hashtags max, only if they add real value
- The post must be specific enough that someone who watched the same
  video would recognize exactly which moment you're referencing

Output ONLY the tweet text. No quotes around it, no label, no preamble.
`;

  return generatePostWithAI("TWITTER", prompt, insights, transcriptLength);
}

/**
 * Generates a Twitter/X thread (6-8 tweets).
 */
export async function generateTwitterThread(insights: GenerationInsights, tone: string, transcriptLength = 0) {
  const toneKey = tone.toLowerCase().replace(/ /g, '_');
  const toneInstruction = TONE_INSTRUCTIONS[toneKey] || TONE_INSTRUCTIONS.casual;

  const prompt = `
Write a Twitter/X thread (6-8 tweets) based on real insights from a video.

CURIOSITY HOOKS: ${insights.curiosity_hooks.join(' | ')}
KEY LESSONS: ${insights.lessons.join(' | ')}
SPECIFIC QUOTES SAID IN THE VIDEO: ${insights.quotes.join(' | ')}
SURPRISING FACTS: ${insights.surprising_facts.join(' | ')}

TONE: ${toneInstruction}

RULES:
- Tweet 1: hook built from a curiosity_hook or surprising_fact, max 220 chars
- Tweets 2-7: one specific insight per tweet, numbered "1/" "2/" etc
- Use at least one of the SPECIFIC QUOTES somewhere in the thread,
  attributed naturally (not as a generic paraphrase)
- Last tweet: clear CTA
- Do not start any tweet with: ${BANNED_PHRASES.join(', ')}
- Every tweet must reference something specific from the lists above —
  no generic statements that could apply to any video on this topic

FORMAT — EXACTLY THIS:
TWEET_1: [content]
---
TWEET_2: 1/ [content]
---
[continue]

Output ONLY the tweets in this format.
`;

  return generatePostWithAI("TWITTER_THREAD", prompt, insights, transcriptLength);
}

/**
 * Generates a LinkedIn post.
 */
export async function generateLinkedInPost(insights: GenerationInsights, tone: string, transcriptLength = 0) {
  const toneKey = tone.toLowerCase().replace(/ /g, '_');
  const toneInstruction = TONE_INSTRUCTIONS[toneKey] || TONE_INSTRUCTIONS.professional;

  const prompt = `
Write a LinkedIn post based on real insights from a video.

STORY/ANECDOTE TO USE: ${pickOne(insights.stories) || insights.interesting_moments[0] || ''}
LESSONS: ${insights.lessons.join(' | ')}
ACTIONABLE ADVICE: ${insights.actionable_advice.join(' | ')}

TONE: ${toneInstruction}

RULES:
- Line 1: one punchy hook sentence, under 10 words
- Build around the specific story/anecdote provided — not a generic claim
- 2-3 short paragraphs, blank line between each
- Numbered list of 3-5 concrete takeaways
- End with a CTA + 3-5 relevant hashtags
- 150-250 words
- Never start with: ${BANNED_PHRASES.join(', ')}

Output ONLY the post. No label, no preamble.
`;

  return generatePostWithAI("LINKEDIN", prompt, insights, transcriptLength);
}

/**
 * Generates an Instagram caption.
 */
export async function generateInstagramCaption(insights: GenerationInsights, tone: string, transcriptLength = 0) {
  const toneKey = tone.toLowerCase().replace(/ /g, '_');
  const toneInstruction = TONE_INSTRUCTIONS[toneKey] || TONE_INSTRUCTIONS.casual;

  const prompt = `
Write an Instagram caption based on real insights from a video.

HOOK (first line): ${pickOne(insights.curiosity_hooks) || pickOne(insights.surprising_facts) || ''}
SECOND LINE: Create curiosity.
BODY: Use arrows (→) for lists and line breaks every 1-3 sentences.
EMOJIS: 1-3 maximum at natural pause points.
CTA: End with "Save this if [reason]" or "Share this with [someone who needs it]".
HASHTAGS: 5-8 hashtags at the very end after 2 blank lines.

TONE: ${toneInstruction}

RULES:
- First two lines are what users see before "...more".
- Line 1: Hook — number, question, or bold claim. NEVER start with "I" as the first word.
- Line 2: Create curiosity.
- Lead with the PERSONAL JOURNEY (emotional arc) when appropriate.
- Never start with: ${BANNED_PHRASES.join(', ')}

OUTPUT ONLY THE CAPTION. NO PREAMBLE.
`;

  return generatePostWithAI("INSTAGRAM", prompt, insights, transcriptLength);
}

/**
 * Generates an Instagram carousel (5 slides).
 */
export async function generateInstagramCarousel(insights: GenerationInsights, tone: string, transcriptLength = 0) {
  const toneKey = tone.toLowerCase().replace(/ /g, '_');
  const toneInstruction = TONE_INSTRUCTIONS[toneKey] || TONE_INSTRUCTIONS.casual;

  const prompt = `
Write an Instagram carousel (5 slides) based on real insights from a video.

SLIDE 1: Hook headline + subline
SLIDE 2: Problem → Steps → Insight (one headline + 2-3 bullets each)
SLIDE 3: Problem → Steps → Insight (one headline + 2-3 bullets each)
SLIDE 4: Problem → Steps → Insight (one headline + 2-3 bullets each)
SLIDE 5: Call to action

Format each slide exactly as:
SLIDE N: [Headline]
→ bullet 1
→ bullet 2

Separate slides with ---

OUTPUT ONLY THE SLIDES. NO PREAMBLE.

TONE: ${toneInstruction}
`;

  return generatePostWithAI("CAROUSEL", prompt, insights, transcriptLength);
}

/**
 * Generates a Facebook post.
 */
export async function generateFacebookPost(insights: GenerationInsights, tone: string, transcriptLength = 0) {
  const toneKey = tone.toLowerCase().replace(/ /g, '_');
  const toneInstruction = TONE_INSTRUCTIONS[toneKey] || TONE_INSTRUCTIONS.casual;

  const prompt = `
Write a Facebook post based on real insights from a video.

TONE: ${toneInstruction}

RULES:
- Conversational, story-driven, 80-180 words
- End with a specific question CTA
- No hashtags unless essential (max 2)
- Never start with: ${BANNED_PHRASES.join(', ')}

OUTPUT ONLY THE POST. NO PREAMBLE.
`;

  return generatePostWithAI("FACEBOOK", prompt, insights, transcriptLength);
}

/**
 * Generates a YouTube Community post.
 */
export async function generateYouTubeCommunityPost(insights: GenerationInsights, tone: string, transcriptLength = 0) {
  const toneKey = tone.toLowerCase().replace(/ /g, '_');
  const toneInstruction = TONE_INSTRUCTIONS[toneKey] || TONE_INSTRUCTIONS.casual;

  const prompt = `
Write a YouTube Community post based on real insights from a video.

TONE: ${toneInstruction}

RULES:
- Short, direct update or poll question
- If poll: include 4 answer options labeled A) B) C) D)
- 40-120 words
- Never start with: ${BANNED_PHRASES.join(', ')}

OUTPUT ONLY THE POST. NO PREAMBLE.
`;

  return generatePostWithAI("COMMUNITY", prompt, insights, transcriptLength);
}

/**
 * Generates a Reel/Short video script.
 */
export async function generateReelScript(insights: GenerationInsights, tone: string, transcriptLength = 0) {
  const toneKey = tone.toLowerCase().replace(/ /g, '_');
  const toneInstruction = TONE_INSTRUCTIONS[toneKey] || TONE_INSTRUCTIONS.casual;

  const prompt = `
Write a Reel / Short video script (spoken word) based on real insights from a video.

TONE: ${toneInstruction}

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
8. Never start with: ${BANNED_PHRASES.join(', ')}

OUTPUT ONLY THE SCRIPT. NO PREAMBLE. NO OTHER LABELS.
`;

  return generatePostWithAI("REEL_SCRIPT", prompt, insights, transcriptLength);
}
