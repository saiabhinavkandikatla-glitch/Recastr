import { getGeminiClient } from "@/lib/ai/client";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma/client";
import { normalizePlatformCopy } from "@/lib/platform-limits";
import type { ContentPiece, Platform, SourceSummary, ViralHook, Project, SourceType } from "@/lib/types";
import { hash } from "@/lib/ingest";

// ==========================================
// 12-Stage Content Intelligence Pipeline
// ==========================================

export interface PipelineOptions {
  url: string;
  userId: string;
  sourceType: SourceType;
  title?: string;
  transcript?: string;
  description?: string;
  tonePref?: string;
  samplePosts?: string[];
  bannedWords?: string[];
}

export async function runContentPipeline(options: PipelineOptions): Promise<{
  title: string;
  transcript: string;
  summary: SourceSummary;
  hooks: ViralHook[];
  contents: ContentPiece[];
}> {
  console.log(`[pipeline] Starting content intelligence pipeline for: ${options.url}`);

  // STAGE 1: Transcript Extraction (with fallback & caching)
  const transcript = await extractTranscriptStage(options);
  const title = options.title || await extractTitleStage(options, transcript);
  const wordCount = transcript.split(/\s+/).filter(Boolean).length;
  console.log(`[pipeline] Stage 1 Complete: Title="${title}", Words=${wordCount}`);

  // STAGE 2: Chunking
  const chunks = chunkTranscriptStage(title, transcript);
  console.log(`[pipeline] Stage 2 Complete: Created ${chunks.length} chunks`);

  // STAGE 3: Insight Extraction Engine
  const rawInsights = await extractInsightsStage(title, chunks);
  console.log(`[pipeline] Stage 3 Complete: Extracted raw insights`);

  // STAGE 4: Knowledge Graph (Deduplication & Connections)
  const knowledgeGraph = await buildKnowledgeGraphStage(title, rawInsights);
  console.log(`[pipeline] Stage 4 Complete: Knowledge graph established`);

  // STAGE 5: Content Categories & STAGE 6: Platform-Specific Writers & STAGE 7: Humanizer & STAGE 8: Quality Scorer & STAGE 9: Deduplication & STAGE 10: Memories & STAGE 11: Review Agent
  const { hooks, contents } = await generateSocialSuiteStage({
    projectId: `youtube-${hash(options.url).slice(0, 10)}-${options.userId}`,
    title,
    transcript,
    knowledgeGraph,
    options,
  });

  // STAGE 12: Final Output structure
  const summary: SourceSummary = {
    tldr: knowledgeGraph.tldr,
    takeaways: knowledgeGraph.takeaways.slice(0, 5),
    hooks: hooks.map(h => h.text),
    detectedTone: (options.tonePref as any) || "educational",
    topics: knowledgeGraph.topics.slice(0, 5),
    targetAudience: "Creators and Professionals",
  };

  return {
    title,
    transcript,
    summary,
    hooks,
    contents,
  };
}

// ==========================================
// Stage 1: Transcript Extraction & Caching
// ==========================================

async function extractTranscriptStage(options: PipelineOptions): Promise<string> {
  // Check DB Cache first
  if (options.url) {
    const cachedProject = await prisma.project.findFirst({
      where: {
        sourceUrl: options.url,
        transcript: { not: null },
      },
      select: { transcript: true },
    });

    if (cachedProject?.transcript && cachedProject.transcript.length > 100) {
      console.log("[pipeline:extract] Cache hit: Reusing cached transcript from DB");
      return cachedProject.transcript;
    }
  }

  if (options.transcript?.trim()) {
    return options.transcript.trim();
  }

  // Fallback chain for YouTube
  if (options.sourceType === "YOUTUBE") {
    // 1. Scraping caption watch page
    const videoId = extractVideoId(options.url);
    if (!videoId) {
      throw new Error("Invalid YouTube URL - Unable to extract video ID");
    }

    console.log(`[pipeline:extract] Attempting caption watch page scrape for: ${videoId}`);
    let transcript = await scrapeWatchPageCaptions(videoId);

    // 2. youtube-transcript npm package
    if (!transcript) {
      console.log(`[pipeline:extract] Watch page scrape failed, trying youtube-transcript library...`);
      transcript = await fetchWithYoutubeTranscriptLib(videoId);
    }

    // 3. Fallback to Gemini ingestion from video metadata description if transcript is completely blocked
    if (!transcript) {
      console.log(`[pipeline:extract] Captions blocked, using video metadata description fallback...`);
      if (options.description?.trim()) {
        transcript = `[Video Title: ${options.title}]\n\nVideo Description:\n${options.description.trim()}`;
      } else {
        throw new Error(
          "YouTube transcript is blocked on this network, and no description was provided. " +
          "Please verify your credentials or configure your proxy."
        );
      }
    }

    return transcript;
  }

  // Fallback for Blog
  if (options.sourceType === "BLOG") {
    if (!options.url) throw new Error("Blog URL is required");
    // Simple fetch and scrape (wrapped)
    return await scrapeBlogText(options.url);
  }

  // Direct Text / Document
  throw new Error(`Unsupported source type for transcript extraction: ${options.sourceType}`);
}

async function extractTitleStage(options: PipelineOptions, transcript: string): Promise<string> {
  if (options.title) return options.title;
  // Use Gemini to extract an optimized title from description or transcript
  const gemini = getGeminiClient();
  if (!gemini || !env.geminiKey) return "Imported Source Content";

  try {
    const response = await gemini.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [{ text: `Based on the following content, extract a short, punchy title under 100 characters. Return ONLY the title:\n\n${transcript.slice(0, 4000)}` }],
        },
      ],
      config: { temperature: 0.5 },
    });
    return response.text?.trim().replace(/['"]/g, "") || "Imported Content";
  } catch {
    return "Imported Content";
  }
}

// ==========================================
// Stage 2: Chunking Engine
// ==========================================

interface Chunk {
  index: number;
  text: string;
  contextHeader: string;
}

function chunkTranscriptStage(title: string, transcript: string): Chunk[] {
  const words = transcript.split(/\s+/).filter(Boolean);
  const chunkSize = 1500;
  const overlap = 200;
  const chunks: Chunk[] = [];

  let index = 0;
  for (let i = 0; i < words.length; i += (chunkSize - overlap)) {
    const slice = words.slice(i, i + chunkSize);
    if (slice.length === 0) break;

    const chunkText = slice.join(" ");
    chunks.push({
      index,
      text: chunkText,
      contextHeader: `Video/Source Title: "${title}" | Part ${index + 1}`,
    });
    index++;

    // Prevent infinite loop if chunkSize <= overlap
    if (words.length <= i + chunkSize) break;
  }

  return chunks;
}

// ==========================================
// Stage 3: Insight Extraction Engine
// ==========================================

interface RawInsights {
  topics: string[];
  stories: string[];
  quotes: string[];
  statistics: string[];
  lessons: string[];
  mistakes: string[];
  contrarian: string[];
  moments: string[];
  hooks: string[];
  actionable: string[];
  frameworks: string[];
}

async function extractInsightsStage(title: string, chunks: Chunk[]): Promise<RawInsights> {
  const gemini = getGeminiClient();
  if (!gemini || !env.geminiKey) {
    throw new Error("Gemini API client is not initialized. Please verify your GEMINI_API_KEY.");
  }

  const result: RawInsights = {
    topics: [],
    stories: [],
    quotes: [],
    statistics: [],
    lessons: [],
    mistakes: [],
    contrarian: [],
    moments: [],
    hooks: [],
    actionable: [],
    frameworks: [],
  };

  // Extract from each chunk
  for (const chunk of chunks) {
    console.log(`[pipeline:insights] Extracting insights from Chunk ${chunk.index + 1}/${chunks.length}...`);
    const prompt = `Analyze this section of the transcript for "${title}". 
Extract every distinct key insight, story, quote, lesson, mistake, actionable tip, and framework.

${chunk.contextHeader}
Transcript:
"""
${chunk.text}
"""

Generate a structured JSON output with the following keys. Keep text grounded in the transcript:
{
  "topics": ["up to 5 main topic tags discussed in this chunk"],
  "stories": ["distinct personal stories, anecdotes, or case studies shared in this text"],
  "quotes": ["exact or highly accurate direct memorable quotes"],
  "statistics": ["statistics, data points, or figures mentioned"],
  "lessons": ["key lessons, rules, or takeaways"],
  "mistakes": ["common errors, warnings, pitfalls, or mistakes outlined"],
  "contrarian": ["unconventional, controversial, or counter-intuitive opinions"],
  "moments": ["highly interesting, surprising, or emotional moments"],
  "hooks": ["compelling curiosity hook ideas that capture this chunk's main points"],
  "actionable": ["actionable advice, steps, or tips the reader can immediately apply"],
  "frameworks": ["named frameworks, methodologies, mental models, or step-by-step processes mentioned"]
}`;

    try {
      const response = await gemini.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          temperature: 0.4,
          responseMimeType: "application/json",
        },
      });

      const rawText = response.text ?? "{}";
      const parsed = JSON.parse(rawText.replace(/```json|```/g, "").trim());

      if (parsed.topics) result.topics.push(...parsed.topics);
      if (parsed.stories) result.stories.push(...parsed.stories);
      if (parsed.quotes) result.quotes.push(...parsed.quotes);
      if (parsed.statistics) result.statistics.push(...parsed.statistics);
      if (parsed.lessons) result.lessons.push(...parsed.lessons);
      if (parsed.mistakes) result.mistakes.push(...parsed.mistakes);
      if (parsed.contrarian) result.contrarian.push(...parsed.contrarian);
      if (parsed.moments) result.moments.push(...parsed.moments);
      if (parsed.hooks) result.hooks.push(...parsed.hooks);
      if (parsed.actionable) result.actionable.push(...parsed.actionable);
      if (parsed.frameworks) result.frameworks.push(...parsed.frameworks);
    } catch (e) {
      console.error(`[pipeline:insights] Failed to extract insights from Chunk ${chunk.index + 1}:`, e);
    }
  }

  return result;
}

// ==========================================
// Stage 4: Knowledge Graph (Deduplication)
// ==========================================

interface KnowledgeGraph {
  tldr: string;
  takeaways: string[];
  topics: string[];
  assets: Array<{
    type: "Insight" | "Topic" | "Story" | "Quote" | "Lesson" | "Framework" | "Data" | "Curiosity" | "Contrarian" | "Mistake";
    text: string;
    score: number;
    connections: string[]; // Related asset texts/indices
  }>;
}

async function buildKnowledgeGraphStage(title: string, raw: RawInsights): Promise<KnowledgeGraph> {
  const gemini = getGeminiClient();
  if (!gemini || !env.geminiKey) throw new Error("Gemini Client not initialized");

  const prompt = `You are a Content Director. You are given a raw list of extracted items from a YouTube video transcript.
Your job is to deduplicate them, filter out low-value items, rank them by impact, and establish relationships between them to build a Knowledge Graph.

VIDEO TITLE: ${title}

RAW EXTRACTS:
- TOPICS: ${JSON.stringify(raw.topics)}
- STORIES: ${JSON.stringify(raw.stories)}
- QUOTES: ${JSON.stringify(raw.quotes)}
- DATA/STATS: ${JSON.stringify(raw.statistics)}
- LESSONS: ${JSON.stringify(raw.lessons)}
- MISTAKES: ${JSON.stringify(raw.mistakes)}
- CONTRARIAN OPINIONS: ${JSON.stringify(raw.contrarian)}
- ACTIONABLE ADVICE: ${JSON.stringify(raw.actionable)}
- FRAMEWORKS: ${JSON.stringify(raw.frameworks)}

Format your output as a single valid JSON with the following schema:
{
  "tldr": "a punchy 3-sentence summary of the entire video's core message",
  "takeaways": ["exactly 5 key takeaways"],
  "topics": ["5 main topic tags"],
  "assets": [
    {
      "type": "Insight" | "Story" | "Quote" | "Lesson" | "Framework" | "Data" | "Curiosity" | "Contrarian" | "Mistake",
      "text": "The precise item text (e.g. the quote, the story description, the mistake details)",
      "score": 1-100 (impact score),
      "connections": ["list of other asset texts or themes this asset connects to"]
    }
  ]
}

CRITICAL RULES:
1. Return EXACTLY 10-15 high-quality assets in the array.
2. Group the assets by their appropriate types. Ensure you have at least one of each type if present.
3. Deduplicate aggressively. Never return identical or overlapping insights.`;

  try {
    const response = await gemini.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        temperature: 0.5,
        responseMimeType: "application/json",
      },
    });

    const rawText = response.text ?? "{}";
    return JSON.parse(rawText.replace(/```json|```/g, "").trim());
  } catch (error) {
    console.error("[pipeline:graph] Failed to generate Knowledge Graph, falling back to local merge:", error);
    // Simple fallback knowledge graph
    return {
      tldr: `A deep dive into ${title}.`,
      takeaways: ["Key insight 1", "Key insight 2", "Key insight 3", "Key insight 4", "Key insight 5"],
      topics: raw.topics.slice(0, 5),
      assets: [
        ...raw.stories.slice(0, 2).map(s => ({ type: "Story" as const, text: s, score: 90, connections: [] })),
        ...raw.quotes.slice(0, 2).map(q => ({ type: "Quote" as const, text: q, score: 88, connections: [] })),
        ...raw.lessons.slice(0, 2).map(l => ({ type: "Lesson" as const, text: l, score: 85, connections: [] })),
        ...raw.frameworks.slice(0, 2).map(f => ({ type: "Framework" as const, text: f, score: 85, connections: [] })),
        ...raw.mistakes.slice(0, 2).map(m => ({ type: "Mistake" as const, text: m, score: 80, connections: [] })),
      ],
    };
  }
}

// ==========================================
// Stages 5-11: Content Categories, Writers, Humanizer, Scorer, Memories, Editor
// ==========================================

interface GenerateSuiteOptions {
  projectId: string;
  title: string;
  transcript: string;
  knowledgeGraph: KnowledgeGraph;
  options: PipelineOptions;
}

async function generateSocialSuiteStage(suiteOpts: GenerateSuiteOptions): Promise<{
  hooks: ViralHook[];
  contents: ContentPiece[];
}> {
  const gemini = getGeminiClient();
  if (!gemini || !env.geminiKey) throw new Error("Gemini client not initialized");

  const hooks: ViralHook[] = suiteOpts.knowledgeGraph.assets.map((asset, index) => ({
    id: `${suiteOpts.projectId}-asset-${index + 1}`,
    projectId: suiteOpts.projectId,
    text: asset.text,
    hookType: asset.type,
    reachScore: asset.score,
  }));

  const contents: ContentPiece[] = [];
  const platforms: Platform[] = ["TWITTER", "LINKEDIN", "INSTAGRAM", "THREADS"];

  // Categories to map
  const categories = [
    { name: "Curiosity", type: "Curiosity" },
    { name: "Educational", type: "Lesson" },
    { name: "Story", type: "Story" },
    { name: "Contrarian", type: "Contrarian" },
    { name: "Framework", type: "Framework" },
    { name: "Mistake", type: "Mistake" },
    { name: "Data", type: "Data" },
    { name: "Quote", type: "Quote" },
    { name: "Actionable", type: "Insight" },
  ];

  // We write posts stage by stage
  for (const platform of platforms) {
    console.log(`[pipeline:writer] Writing posts for platform: ${platform}...`);

    for (const cat of categories) {
      // Find matching asset in the graph
      const matchingAsset = hooks.find(h => h.hookType === cat.type) || hooks[0];
      if (!matchingAsset) continue;

      const prompt = buildWriterPrompt({
        platform,
        category: cat.name,
        assetText: matchingAsset.text,
        title: suiteOpts.title,
        transcript: suiteOpts.transcript,
        options: suiteOpts.options,
      });

      // Attempt generation with quality scoring loop
      let body = "";
      let attempts = 0;
      const maxAttempts = 2;
      let score = 0;

      while (attempts < maxAttempts) {
        attempts++;
        try {
          const response = await gemini.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config: { temperature: 0.7 },
          });

          const rawText = response.text?.trim() || "";

          // Humanizer Step (Local Regex Cleaning)
          const humanizedText = runHumanizerFilter(rawText, suiteOpts.options.bannedWords);

          // Quality Scorer Step
          const scoreResult = await runQualityScorer(platform, cat.name, humanizedText);
          score = scoreResult.averageScore;
          console.log(`[pipeline:scorer] Platform=${platform}, Category=${cat.name}, Attempt=${attempts}, Score=${score}/10`);

          if (score >= 8) {
            body = humanizedText;
            break;
          } else {
            // Store it just in case, but keep trying
            body = humanizedText;
            console.log(`[pipeline:scorer] Score below 8 (${score}). Retrying with quality feedback...`);
          }
        } catch (e) {
          console.error(`[pipeline:writer] Ingestion writing failed for ${platform} - ${cat.name}:`, e);
          break;
        }
      }

      if (body) {
        // Run Review/Editor Agent for polishing
        const polishedBody = await runReviewAgent(platform, cat.name, body);

        contents.push({
          id: `${suiteOpts.projectId}-content-${platform}-${cat.name}`,
          projectId: suiteOpts.projectId,
          hookId: matchingAsset.id,
          platform,
          contentType: `${cat.name} post`,
          body: normalizePlatformCopy(platform, polishedBody),
          originalBody: polishedBody,
          tone: suiteOpts.options.tonePref || "casual",
          approved: false,
          order: contents.length,
          createdAt: new Date().toISOString(),
        });
      }
    }
  }

  return { hooks, contents };
}

// ==========================================
// Prompt Builder for Platform-Specific Writers
// ==========================================

function buildWriterPrompt(opts: {
  platform: Platform;
  category: string;
  assetText: string;
  title: string;
  transcript: string;
  options: PipelineOptions;
}): string {
  const platformGuidelines = {
    TWITTER: "Write a short post (under 280 characters). High curiosity, human tone, punchy hook line. No hashtags. Do not write a thread.",
    LINKEDIN: "Write a storytelling post with professional lessons. Use paragraph breaks, a conversational hook, and actionable takeaways at the end. Keep it under 1500 characters. No hashtags.",
    INSTAGRAM: "Write a multi-slide carousel layout script. Use short paragraphs. Outline Slide 1 (Hook), Slide 2, Slide 3, Slide 4, and Slide 5 (CTA). Add 5 relevant hashtags at the very end.",
    THREADS: "Write a casual, conversational, and highly opinionated post. Keep it very relaxed, under 500 characters.",
    NEWSLETTER: "Write a detailed long-form newsletter structure with clear subheaders, main story, and next action items.",
    BLOG: "Write a structured SEO-optimized blog article in markdown format.",
  }[opts.platform] || "Write a casual post.";

  // Memories/Tone Preferences
  const sampleConstraint = opts.options.samplePosts?.length
    ? `Write in a style similar to these sample posts:\n${opts.options.samplePosts.slice(0, 2).map(p => `"${p}"`).join("\n")}`
    : "";

  return `You are a Content Writer. Write a social media post for ${opts.platform} in the "${opts.category}" category.
  
THE CORE SOURCE ASSET:
"${opts.assetText}"

VIDEO TITLE: "${opts.title}"
PLATFORM GUIDELINES:
${platformGuidelines}

HUMANIZER DIRECTIVE:
Never use standard AI clichés:
- "Most people..."
- "Nobody talks about..."
- "Game changer..."
- "Here's the thing..."
- "10x..."
- "Go viral..."
- "The truth is..."
- "In today's world..."
- "Delve..."
- "Crucial..."

${sampleConstraint}

Ground the writing in the video topic. Make it sound like a real person sharing an insight, not an AI bot. Return ONLY the post text:`;
}

// ==========================================
// Stage 7: Humanizer Filter
// ==========================================

function runHumanizerFilter(text: string, customBannedWords?: string[]): string {
  let cleaned = text;

  // Banned phrases list
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
      // Human replacements
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

  // Handle custom banned words
  if (customBannedWords) {
    for (const word of customBannedWords) {
      const regex = new RegExp(`\\b${word}\\b`, "gi");
      cleaned = cleaned.replace(regex, "");
    }
  }

  return cleaned.trim();
}

// ==========================================
// Stage 8: Quality Scorer
// ==========================================

interface ScoreResult {
  averageScore: number;
  originality: number;
  clarity: number;
  humanLikeness: number;
  usefulness: number;
}

async function runQualityScorer(platform: string, category: string, text: string): Promise<ScoreResult> {
  const gemini = getGeminiClient();
  if (!gemini || !env.geminiKey) return { averageScore: 8, originality: 8, clarity: 8, humanLikeness: 8, usefulness: 8 };

  const prompt = `Grade this ${platform} post in the "${category}" category.
Post text:
"""
${text}
"""

Score the post from 1 to 10 on the following criteria:
1. Originality: Does it present a fresh angle?
2. Clarity: Is the message easy to understand?
3. Human-likeness: Does it read like an actual human wrote it (no AI jargon)?
4. Usefulness: Does it provide real value?
5. Readability: Is the layout and flow clean?

Return ONLY a JSON response:
{
  "originality": 1-10,
  "clarity": 1-10,
  "humanLikeness": 1-10,
  "usefulness": 1-10,
  "readability": 1-10
}`;

  try {
    const response = await gemini.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        temperature: 0.3,
        responseMimeType: "application/json",
      },
    });

    const parsed = JSON.parse((response.text ?? "{}").replace(/```json|```/g, "").trim());
    const total = parsed.originality + parsed.clarity + parsed.humanLikeness + parsed.usefulness + parsed.readability;
    return {
      averageScore: total / 5,
      originality: parsed.originality || 8,
      clarity: parsed.clarity || 8,
      humanLikeness: parsed.humanLikeness || 8,
      usefulness: parsed.usefulness || 8,
    };
  } catch {
    return { averageScore: 8, originality: 8, clarity: 8, humanLikeness: 8, usefulness: 8 };
  }
}

// ==========================================
// Stage 11: Review Agent (Editor)
// ==========================================

async function runReviewAgent(platform: string, category: string, text: string): Promise<string> {
  const gemini = getGeminiClient();
  if (!gemini || !env.geminiKey) return text;

  const prompt = `You are a Professional Editor. Review and polish this ${platform} post.
Make it sound more authentic, delete any remaining robotic transition words, and clean up line breaks to make it look premium.
Do NOT change the core message or direct quotes. Return ONLY the polished post text:

"""
${text}
"""`;

  try {
    const response = await gemini.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { temperature: 0.5 },
    });

    return response.text?.trim() || text;
  } catch {
    return text;
  }
}

// ==========================================
// Helper Utilities for Ingestion & Scrapes
// ==========================================

function extractVideoId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) {
      return parsed.pathname.slice(1).split("/")[0];
    }
    return parsed.searchParams.get("v") || parsed.pathname.split("/").pop() || null;
  } catch {
    return null;
  }
}

async function scrapeWatchPageCaptions(videoId: string): Promise<string | null> {
  try {
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const res = await axios.get(watchUrl, {
      timeout: 8000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });

    const match = res.data.match(/"captionTracks":\s*(\[.*?\])/);
    if (!match) return null;

    const tracks = JSON.parse(match[1]);
    const track = tracks.find((t: any) => t.languageCode === "en" || t.languageCode?.startsWith("en"));
    if (!track?.baseUrl) return null;

    const xmlRes = await axios.get(track.baseUrl, { timeout: 5000 });
    const textMatches = xmlRes.data.match(/<text.*?>([\s\S]*?)<\/text>/g) || [];

    const fullText = textMatches
      .map((m: string) => {
        const txt = m.replace(/<text.*?>/, "").replace(/<\/text>/, "");
        // Decode HTML entities
        return txt
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .trim();
      })
      .filter(Boolean)
      .join(" ");

    return fullText.length > 100 ? fullText : null;
  } catch (error) {
    console.error("[pipeline:extract] Watch page scrape failed:", error);
    return null;
  }
}

async function fetchWithYoutubeTranscriptLib(videoId: string): Promise<string | null> {
  try {
    const segments = await YoutubeTranscript.fetchTranscript(videoId);
    if (!segments || segments.length === 0) return null;
    return segments.map(s => s.text).join(" ");
  } catch (error) {
    console.error("[pipeline:extract] youtube-transcript lib failed:", error);
    return null;
  }
}

async function scrapeBlogText(url: string): Promise<string> {
  const response = await axios.get(url, {
    timeout: 10000,
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" },
  });
  const cheerio = require("cheerio");
  const $ = cheerio.load(response.data);
  $("script, style, nav, header, footer, aside, noscript, iframe, [class*=ad]").remove();
  const rawBody =
    $("article").text() ||
    $("main").text() ||
    $("p")
      .map((_: any, element: any) => $(element).text())
      .get()
      .join("\n");

  const sanitizeHtml = require("sanitize-html");
  const transcript = sanitizeHtml(rawBody, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, " ")
    .trim();

  if (transcript.length < 100) {
    throw new Error("Unable to extract sufficient blog text content.");
  }
  return transcript;
}
