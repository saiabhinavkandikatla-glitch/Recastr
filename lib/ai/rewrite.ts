import { generateAIText, getAIClient } from "@/lib/ai/client";
import { env } from "@/lib/env";

export type RewriteMode =
  | "professional"
  | "casual"
  | "storytelling"
  | "viral"
  | "educational"
  | "founder"
  | "personal_brand";

export interface RewriteResult {
  mode: RewriteMode;
  content: string;
  platform: string;
}

const REWRITE_MODE_PROMPTS: Record<RewriteMode, string> = {
  professional: `
You are rewriting social media content in a PROFESSIONAL tone.

Rules:
- Authoritative but not stiff. Think McKinsey partner who's also a creator.
- Lead with insight, not personal story
- Use data and specifics from the original content
- No slang, no excessive punctuation, no emojis
- Short declarative sentences
- LinkedIn-ready — would look at home from a VP or Director

Banned words/phrases: "game-changer", "hustle", "crushing it", "leveling up", "at the end of the day"
`,

  casual: `
You are rewriting social media content in a CASUAL, conversational tone.

Rules:
- Write like you're texting a smart friend, not presenting to a boardroom
- Use contractions always: "I've", "you're", "it's", "don't"
- Short sentences. Very short sometimes. Like this.
- First person, present tense where possible
- 1-2 emojis max, only where natural
- Can start sentences with "And", "But", "So"
- Sounds like a real human wrote it at 11pm, not a marketing team

Banned phrases: "I am pleased to share", "As we navigate", "In today's landscape", "It is important to note"
`,

  storytelling: `
You are rewriting social media content as a STORY with narrative structure.

Rules:
- Open with a scene, a moment, or a specific point in time ("Month 4. I almost quit.")
- Follow the arc: Setup → Conflict/Tension → Resolution → Lesson
- Use sensory or emotional details to make it vivid
- The reader should feel like they're watching it happen, not reading a summary
- End with the lesson that emerges naturally from the story
- No bullet points — pure prose paragraphs with line breaks
- The best story posts feel like the first paragraph of a memoir

Structure to follow:
[Opening scene — drop reader into a moment]
[blank line]
[What happened — the tension]
[blank line]  
[The turn — what changed]
[blank line]
[The lesson — what it means for the reader]
`,

  viral: `
You are rewriting social media content to MAXIMIZE virality and shareability.

Rules:
- First line must be impossible to scroll past. Use ONE of:
  • A shocking number: "I made $8,400/month with 0 employees."
  • A counter-intuitive claim: "Consistency is the wrong advice."
  • A personal confession: "I almost deleted everything in month 4."
  • A bold promise: "This framework saved me 20 hours a week."
- Create a "curiosity gap" — give them just enough to NEED to keep reading
- Use line breaks aggressively — one sentence per line where possible
- Arrow lists (→) for any sequences or steps
- The middle must deliver on the hook's promise — never bait-and-switch
- End with something that makes people want to save or share
- Include 1 question at the end that makes the reader reflect on themselves

Viral content formula:
HOOK (shocking/counter-intuitive) → PROOF (specific numbers/story) → INSIGHT (the non-obvious lesson) → CTA (save/share/follow)
`,

  educational: `
You are rewriting social media content in an EDUCATIONAL, teach-me-something tone.

Rules:
- Position the author as a knowledgeable guide sharing a framework or system
- Use numbered steps or clear sequences when the content has a process
- Define any jargon — never assume the reader knows the term
- Use analogies to make complex ideas simple
- "Here's why this works:" is a good bridge between point and explanation
- End with a takeaway the reader can apply TODAY, not someday
- Tone: warm professor, not cold textbook

Structure options:
Option A — Framework post: "The [Name] Framework: [3-5 steps]"
Option B — Myth-bust: "Most people think X. Here's what actually works."
Option C — How-to: "How to [outcome] in [timeframe]: [numbered steps]"
`,

  founder: `
You are rewriting social media content in the voice of a FOUNDER sharing behind-the-scenes reality.

Rules:
- Raw and honest. Founders share what most people hide.
- Include the struggle and the doubt, not just the wins
- Use real numbers — revenue, time, mistakes, costs
- Write in the first person, past or present tense
- The tone is: "I'm still figuring this out, here's what I've learned so far"
- Reference the actual business decisions, tradeoffs, failures
- Never humble-brag — if you share a win, also share the cost of that win
- Ends with something that makes other founders nod and think "same"

What founder content is NOT:
- "Excited to announce" posts
- Polished PR narratives
- Advice without the story behind it
`,

  personal_brand: `
You are rewriting social media content to build a PERSONAL BRAND — making the author 
known for a specific point of view, expertise, or way of seeing the world.

Rules:
- The author should have a clear, ownable perspective ("I believe X even though most people think Y")
- Content should make people think: "That's so [author's name]" — a recognizable voice
- Weave the author's specific niche/expertise into the content naturally
- Use the author's unique terminology or frameworks if any are in the original
- This content should feel like it could ONLY come from this specific person
- Build intrigue about the person, not just value about the topic
- End with something that makes people want to follow to see what comes next

Personal brand post formula:
[Ownable opinion or observation] → [Why you of all people are saying this] → [The insight only you could give] → [What this means for your audience]
`
};

export async function rewriteContent(
  originalContent: string,
  platform: string,
  mode: RewriteMode,
  extractedFacts?: object
): Promise<string> {
  const modePrompt = REWRITE_MODE_PROMPTS[mode];

  const systemPrompt = `
${modePrompt}

CRITICAL RULES (apply regardless of mode):
1. PRESERVE all specific numbers, names, and facts from the original. Never swap real data for generic placeholders.
2. KEEP the platform format: 
   - LinkedIn: em-dash (—) breaks, short paragraphs, no hashtags
   - Twitter/X: numbered tweets (1/ 2/ 3/), each under 280 chars
   - Instagram: arrow lists (→), blank line rhythm, hashtags at end
   - Reel: [HOOK 0-3s] timestamps, short sentences for on-camera delivery
3. OUTPUT only the rewritten content — no preamble, no "Here's the rewritten version:", no explanation.
4. Match the length of the original (within 20% word count).
`;

  const userMessage = `
Platform: ${platform}
Rewrite mode: ${mode.toUpperCase()}

Original content to rewrite:
---
${originalContent}
---

${extractedFacts ? `Source facts to preserve:\n${JSON.stringify(extractedFacts, null, 2)}` : ""}

Rewrite this content now in ${mode} tone for ${platform}. Output only the rewritten post.
`;

  const aiClient = getAIClient();
  if (aiClient && !env.demoMode) {
    try {
      const fullPrompt = `${systemPrompt}\n\n${userMessage}`;
      const text = await generateAIText({
        model: "gpt-5.4-mini",
        prompt: fullPrompt,
        temperature: 0.6,
      });
      return runHumanizerFilter(text.trim());
    } catch (err) {
      console.error("OpenAI rewrite API failed, falling back to local:", err);
    }
  }

  // Fallback if aiClient not configured or in demo mode
  return runHumanizerFilter(fallbackLocalRewrite(originalContent, mode));
}

function fallbackLocalRewrite(content: string, mode: RewriteMode): string {
  const title = mode.charAt(0).toUpperCase() + mode.slice(1).replace("_", " ");
  return `[${title} Tone Version]\n\n${content}`;
}

function runHumanizerFilter(text: string): string {
  let cleaned = text;
  const banned = [
    /most people/gi,
    /nobody talks about/gi,
    /game changer/gi,
    /game-changing/gi,
    /here's the thing/gi,
    /10x/gi,
    /go viral/gi,
    /the truth is/gi,
    /in today's world/gi,
    /it's important to note/gi,
    /in conclusion/gi,
    /delve/gi,
    /crucial/gi,
  ];

  for (const regex of banned) {
    cleaned = cleaned.replace(regex, (match) => {
      if (match.toLowerCase().includes("most people")) return "many creators";
      if (match.toLowerCase().includes("nobody talks about")) return "we rarely discuss";
      if (match.toLowerCase().includes("game changer") || match.toLowerCase().includes("game-changing")) return "incredibly useful";
      if (match.toLowerCase().includes("here's the thing")) return "the reality is";
      if (match.toLowerCase().includes("10x")) return "significantly speed up";
      if (match.toLowerCase().includes("go viral")) return "reach more people";
      if (match.toLowerCase().includes("the truth is")) return "honestly";
      if (match.toLowerCase().includes("delve")) return "look into";
      if (match.toLowerCase().includes("crucial")) return "essential";
      return "";
    });
  }
  return cleaned.trim();
}
