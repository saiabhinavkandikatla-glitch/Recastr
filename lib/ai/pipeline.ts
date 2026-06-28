import { getAIClient } from "@/lib/ai/client";
import axios from "axios";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma/client";
import { normalizePlatformCopy } from "@/lib/platform-limits";
import type { ContentPiece, Platform, SourceSummary, ViralHook, SourceType, Project } from "@/lib/types";
import { hash } from "@/lib/ingest";
import { extractVideoId, getYouTubeTranscript } from "@/lib/transcript";
import * as cheerio from "cheerio";
import sanitizeHtml from "sanitize-html";
import { contentIntelligenceService } from "@/lib/content-intelligence/service";

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

const MIN_TRANSCRIPT_WORDS = 50;

type PipelineStageStatus = "SUCCESS" | "FAILED" | "SKIPPED";

function logPipelineStage(
  stage: string,
  fields: {
    status: PipelineStageStatus;
    input?: string;
    output?: string;
    length?: number;
    words?: number;
    provider?: string;
    videoId?: string | null;
    error?: string;
    startedAt: number;
  },
) {
  console.log(
    [
      `[${stage}]`,
      `Status: ${fields.status}`,
      fields.videoId ? `Video ID: ${fields.videoId}` : undefined,
      fields.provider ? `Provider: ${fields.provider}` : undefined,
      fields.input ? `Input: ${fields.input}` : undefined,
      fields.output ? `Output: ${fields.output}` : undefined,
      `Length: ${fields.length ?? 0}`,
      fields.words === undefined ? undefined : `Words: ${fields.words}`,
      `Execution time: ${Date.now() - fields.startedAt}ms`,
      fields.error ? `Errors: ${fields.error}` : undefined,
    ]
      .filter(Boolean)
      .join("\n"),
  );
}

export async function runContentPipeline(options: PipelineOptions): Promise<{
  title: string;
  transcript: string;
  summary: SourceSummary;
  hooks: ViralHook[];
  contents: ContentPiece[];
}> {
  console.log(`[pipeline] Starting content intelligence pipeline for: ${options.url}`);

  // STAGE 1: Transcript Extraction
  const stage1Start = Date.now();
  console.log(`[STAGE 1: Transcript Extraction] START\n- Input URL: ${options.url}`);
  let transcript = "";
  try {
    transcript = await extractTranscriptStage(options);
    const duration = Date.now() - stage1Start;
    console.log(`[STAGE 1: Transcript Extraction] SUCCESS\n- Duration: ${duration}ms\n- Output length: ${transcript.length} chars`);
  } catch (error: any) {
    const duration = Date.now() - stage1Start;
    console.error(`[STAGE 1: Transcript Extraction] FAILED\n- Duration: ${duration}ms\n- Reason: ${error.message || error}`);
    throw error;
  }

  const title = options.title || await extractTitleStage(options, transcript);
  const wordCount = transcript ? transcript.split(/\s+/).filter(Boolean).length : 0;
  if (!transcript || wordCount < MIN_TRANSCRIPT_WORDS) {
    throw new Error(`[INGESTION] stage failed: Transcript has ${wordCount} words; minimum is ${MIN_TRANSCRIPT_WORDS}.`);
  }

  // STAGE 2: Chunking
  const stage2Start = Date.now();
  console.log(`[STAGE 2: Chunking] START\n- Input: wordCount=${wordCount}`);
  let chunks;
  try {
    chunks = chunkTranscriptStage(title, transcript);
    const duration = Date.now() - stage2Start;
    console.log(`[STAGE 2: Chunking] SUCCESS\n- Duration: ${duration}ms\n- Output chunks: ${chunks.length}`);
  } catch (error: any) {
    const duration = Date.now() - stage2Start;
    console.error(`[STAGE 2: Chunking] FAILED\n- Duration: ${duration}ms\n- Reason: ${error.message || error}`);
    throw error;
  }
  if (!chunks || chunks.length === 0) {
    throw new Error("[CHUNKING] stage failed: Created zero chunks.");
  }

  // STAGE 3: Insight Extraction Engine (Fact Extraction)
  const stage3Start = Date.now();
  console.log(`[STAGE 3: Fact & Insight Extraction] START\n- Input chunks: ${chunks.length}`);
  let rawInsights;
  try {
    const extractedInsights = await extractInsightsStage(title, chunks);
    rawInsights = validateEvidenceStage(title, transcript, extractedInsights);
    const duration = Date.now() - stage3Start;
    console.log(`[STAGE 3: Fact & Insight Extraction] SUCCESS\n- Duration: ${duration}ms\n- Output insights: ${rawInsights?.insights?.length ?? 0}`);
  } catch (error: any) {
    const duration = Date.now() - stage3Start;
    console.error(`[STAGE 3: Fact & Insight Extraction] FAILED\n- Duration: ${duration}ms\n- Reason: ${error.message || error}`);
    throw error;
  }
  if (!rawInsights || !rawInsights.insights || rawInsights.insights.length === 0) {
    throw new Error("[FACT EXTRACTION] stage failed: Extracted zero insights/facts.");
  }

  // STAGE 4: Knowledge Graph (Deduplication & Connections)
  const stage4Start = Date.now();
  console.log(`[STAGE 4: Knowledge Graph] START\n- Input insights: ${rawInsights.insights.length}`);
  let knowledgeGraph;
  try {
    knowledgeGraph = await buildKnowledgeGraphStage(title, rawInsights);
    const duration = Date.now() - stage4Start;
    console.log(`[STAGE 4: Knowledge Graph] SUCCESS\n- Duration: ${duration}ms\n- Output topics: ${knowledgeGraph.topics.length}`);
  } catch (error: any) {
    const duration = Date.now() - stage4Start;
    console.error(`[STAGE 4: Knowledge Graph] FAILED\n- Duration: ${duration}ms\n- Reason: ${error.message || error}`);
    throw error;
  }

  // STAGE 5 onwards: Generation
  const stage5Start = Date.now();
  console.log(`[STAGE 5: Content Generation] START\n- Input: topics=${knowledgeGraph.topics.length}`);
  let suite;
  try {
    suite = await generateSocialSuiteStage({
      projectId: `youtube-${hash(options.url).slice(0, 10)}-${options.userId}`,
      title,
      transcript,
      knowledgeGraph,
      options,
    });
    const duration = Date.now() - stage5Start;
    console.log(`[STAGE 5: Content Generation] SUCCESS\n- Duration: ${duration}ms\n- Output hooks: ${suite.hooks.length}, contents: ${suite.contents.length}`);
  } catch (error: any) {
    const duration = Date.now() - stage5Start;
    console.error(`[STAGE 5: Content Generation] FAILED\n- Duration: ${duration}ms\n- Reason: ${error.message || error}`);
    throw error;
  }

  const { hooks, contents } = suite;

  // Log generation stage details
  const factsSupplied = rawInsights?.insights ? rawInsights.insights.length : 0;
  const contextSize = chunks.map(c => c.text.length).reduce((a, b) => a + b, 0);
  const generatedTokens = contents.map(c => c.body.length).reduce((a, b) => a + b, 0);
  console.log(`[GENERATION]\nFacts supplied to LLM: ${factsSupplied}\nContext size: ${contextSize}\nProvider used: NVIDIA NIM/local fallback\nPrompt version: v1\nGenerated tokens: ${generatedTokens}`);

  // STAGE 12: Final Output structure
  const summary: SourceSummary = {
    tldr: knowledgeGraph.tldr,
    takeaways: knowledgeGraph.takeaways.slice(0, 5),
    hooks: hooks.map(h => h.text),
    detectedTone: "educational",
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
  const urlValidationStartedAt = Date.now();
  if (!options.url || !/^https?:\/\//i.test(options.url)) {
    logPipelineStage("URL Validation", {
      status: "FAILED",
      input: options.url || "",
      length: options.url?.length ?? 0,
      error: "URL is missing or invalid.",
      startedAt: urlValidationStartedAt,
    });
    throw new Error("[URL Validation] stage failed: URL is missing or invalid.");
  }

  logPipelineStage("URL Validation", {
    status: "SUCCESS",
    input: options.url,
    output: options.sourceType,
    length: options.url.length,
    startedAt: urlValidationStartedAt,
  });

  if (options.transcript?.trim()) {
    const manualStartedAt = Date.now();
    const transcript = normalizeTranscript(options.transcript);
    const words = countWords(transcript);
    logPipelineStage("Transcript Provider", {
      status: words >= MIN_TRANSCRIPT_WORDS ? "SUCCESS" : "FAILED",
      provider: "manual",
      input: "manual transcript payload",
      output: transcript.slice(0, 500),
      length: transcript.length,
      words,
      error: words >= MIN_TRANSCRIPT_WORDS ? undefined : `Manual transcript has ${words} words; minimum is ${MIN_TRANSCRIPT_WORDS}.`,
      startedAt: manualStartedAt,
    });
    if (words < MIN_TRANSCRIPT_WORDS) {
      throw new Error(`[Transcript Provider] stage failed: Manual transcript has ${words} words; minimum is ${MIN_TRANSCRIPT_WORDS}.`);
    }
    return transcript;
  }

  const cacheStartedAt = Date.now();
  let cachedProject: { transcript: string | null } | null = null;
  try {
    cachedProject = await prisma.project.findFirst({
      where: {
        sourceUrl: options.url,
        transcript: { not: null },
      },
      select: { transcript: true },
    });

    const cachedTranscript = normalizeTranscript(cachedProject?.transcript ?? "");
    const cachedWords = countWords(cachedTranscript);
    if (cachedWords >= MIN_TRANSCRIPT_WORDS && !isPlaceholderTranscript(cachedTranscript)) {
      logPipelineStage("Transcript Provider", {
        status: "SUCCESS",
        provider: "database-cache",
        input: options.url,
        output: cachedTranscript.slice(0, 500),
        length: cachedTranscript.length,
        words: cachedWords,
        startedAt: cacheStartedAt,
      });
      return cachedTranscript;
    }

    if (cachedProject?.transcript) {
      logPipelineStage("Transcript Provider", {
        status: "SKIPPED",
        provider: "database-cache",
        input: options.url,
        output: "Cached transcript was empty, too short, or placeholder-like.",
        length: cachedTranscript.length,
        words: cachedWords,
        startedAt: cacheStartedAt,
      });
    }
  } catch (error) {
    logPipelineStage("Transcript Provider", {
      status: "SKIPPED",
      provider: "database-cache",
      input: options.url,
      output: "Cache lookup failed; continuing to configured transcript provider.",
      length: 0,
      error: error instanceof Error ? error.message : String(error),
      startedAt: cacheStartedAt,
    });
  }

  // Fallback chain for YouTube
  if (options.sourceType === "YOUTUBE") {
    const videoIdStartedAt = Date.now();
    const parsedVideoId = extractVideoId(options.url);
    if (!parsedVideoId) {
      logPipelineStage("Video ID Extraction", {
        status: "FAILED",
        input: options.url,
        length: options.url.length,
        error: "Unable to extract an 11-character YouTube video ID.",
        startedAt: videoIdStartedAt,
      });
      throw new Error("[Video ID Extraction] stage failed: Unable to extract YouTube video ID.");
    }

    logPipelineStage("Video ID Extraction", {
      status: "SUCCESS",
      input: options.url,
      output: parsedVideoId,
      videoId: parsedVideoId,
      length: parsedVideoId.length,
      startedAt: videoIdStartedAt,
    });

    const providerStartedAt = Date.now();
    const transcriptResult = await getYouTubeTranscript(options.url);
    if (!transcriptResult.success || !transcriptResult.transcript) {
      logPipelineStage("Transcript Provider", {
        status: "FAILED",
        provider: transcriptResult.provider ?? "all-providers",
        input: options.url,
        videoId: parsedVideoId,
        length: 0,
        words: 0,
        error: `${transcriptResult.code ?? "TRANSCRIPT_UNAVAILABLE"}: ${transcriptResult.reason ?? transcriptResult.error ?? "Transcript unavailable"}`,
        startedAt: providerStartedAt,
      });
      throw new Error(JSON.stringify({
        code: transcriptResult.code ?? "TRANSCRIPT_UNAVAILABLE",
        reason: transcriptResult.reason ?? transcriptResult.error ?? "Transcript unavailable",
        provider: transcriptResult.provider ?? "all-providers",
        failures: transcriptResult.failures ?? [],
      }));
    }

    const providerTranscript = transcriptResult.transcript;
    const normalized = normalizeTranscript(providerTranscript);
    const words = countWords(normalized);
    logPipelineStage("Transcript Parsing", {
      status: words >= MIN_TRANSCRIPT_WORDS ? "SUCCESS" : "FAILED",
      provider: transcriptResult.provider,
      input: `Provider transcript chars=${providerTranscript.length}`,
      output: normalized.slice(0, 500),
      length: normalized.length,
      words,
      error: words >= MIN_TRANSCRIPT_WORDS ? undefined : `Transcript has ${words} words; minimum is ${MIN_TRANSCRIPT_WORDS}.`,
      startedAt: providerStartedAt,
    });
    if (words < MIN_TRANSCRIPT_WORDS) {
      throw new Error(`[Transcript Parsing] stage failed: Transcript has ${words} words; minimum is ${MIN_TRANSCRIPT_WORDS}.`);
    }

    return normalized;

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

function normalizeTranscript(value: string) {
  return (value ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function countWords(value: string) {
  return value.split(/\s+/).filter(Boolean).length;
}

function isPlaceholderTranscript(value: string) {
  const lower = value.toLowerCase();
  return (
    lower.includes("content generation requires a transcript") ||
    lower.includes("transcript unavailable") ||
    lower.includes("paste transcript manually") ||
    lower.includes("recastr imported the real youtube source metadata") ||
    lower.startsWith("source url:")
  );
}


async function scrapeBlogText(url: string): Promise<string> {
  try {
    console.log(`[pipeline:extract] Scraping blog content from URL: ${url}`);

    const res = await axios.get(url, {
      timeout: 10000,
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
    });

    const $ = cheerio.load(res.data);

    // Remove unwanted elements
    $('script, style, nav, header, footer, .advertisement, .ads, .comments, .sidebar').remove();

    // Try to extract main content
    let text = '';

    // Common content selectors
    const selectors = [
      'article',
      '.post-content',
      '.entry-content',
      '.content',
      '.post',
      'main',
      '#content',
      '.article-body',
      '.blog-post'
    ];

    for (const selector of selectors) {
      const content = $(selector).first();
      if (content.length > 0) {
        text = content.text().trim();
        if (text.length > 100) break;
      }
    }

    // If no specific content found, get body text
    if (text.length < 100) {
      text = $('body').text().trim();
    }

    // Clean up text
    text = text
      .replace(/\s+/g, ' ')  // Multiple spaces to single space
      .replace(/^\s+|\s+$/g, '')  // Trim
      .replace(/\n+/g, ' ')  // Newlines to spaces
      .trim();

    if (text.length > 50) {
      console.log(`[pipeline:extract] Successfully scraped ${text.length} characters of blog content`);
      return text;
    } else {
      throw new Error(`Scraped content too short: ${text.length} characters`);
    }
  } catch (error) {
    console.error(`[pipeline:extract] Blog scraping failed for URL ${url}:`, error);
    throw new Error(`Failed to extract content from blog: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// STAGE FUNCTIONS FOR THE 12-STAGE PIPELINE

// STAGE 2: Title Extraction
async function extractTitleStage(options: PipelineOptions, transcript: string): Promise<string> {
  // If title is provided in options, use it
  if (options.title?.trim()) {
    return options.title.trim();
  }

  // Try to extract title from transcript
  if (transcript.trim()) {
    const lines = transcript.split(/\n+/).map(line => line.trim()).filter(line => line.length > 0);

    // Look for title-like patterns in first few lines
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i];
      // Skip lines that are too long to be titles or contain URL patterns
      if (line.length > 10 && line.length < 100 &&
          !line.includes('http://') && !line.includes('https://') &&
          !line.includes('www.')) {
        return line;
      }
    }
  }

  // Fallback: generate title from content or use URL-based title
  if (options.url) {
    try {
      const urlObj = new URL(options.url);
      const hostname = urlObj.hostname.replace(/^www\./, '');
      const pathname = urlObj.pathname.replace(/\/+/g, ' ').replace(/^\s+|\s+$/g, '');

      if (hostname && pathname) {
        return `${hostname} ${pathname}`.trim();
      }

      return hostname || 'Unknown Source';
    } catch {
      // If URL parsing fails, use a generic title
    }
  }

  // Last resort fallback
  return `Content Item ${Date.now()}`;
}

// STAGE 3: Transcript Chunking
function chunkTranscriptStage(title: string, transcript: string): Array<{ id: string; text: string; startIndex: number; endIndex: number }> {
  if (!transcript || transcript.trim() === '') {
    return [{ id: 'chunk-1', text: title || 'No content', startIndex: 0, endIndex: 0 }];
  }

  const chunks: Array<{ id: string; text: string; startIndex: number; endIndex: number }> = [];
  const maxWordsPerChunk = 500; // Process in chunks of ~500 words
  const words = transcript.split(/\s+/);

  let startIndex = 0;
  let chunkId = 1;

  while (startIndex < words.length) {
    const endIndex = Math.min(startIndex + maxWordsPerChunk, words.length);
    const chunkWords = words.slice(startIndex, endIndex);
    const chunkText = chunkWords.join(' ');

    chunks.push({
      id: `chunk-${chunkId}`,
      text: chunkText,
      startIndex: startIndex,
      endIndex: endIndex - 1
    });

    startIndex = endIndex;
    chunkId++;
  }

  // If no chunks were created (shouldn't happen), create a single chunk
  if (chunks.length === 0) {
    chunks.push({
      id: 'chunk-1',
      text: transcript,
      startIndex: 0,
      endIndex: transcript.length
    });
  }

  return chunks;
}

// STAGE 3: Insight Extraction Engine
async function extractInsightsStage(title: string, chunks: Array<{ id: string; text: string; startIndex: number; endIndex: number }>) {
  // Use the ContentIntelligenceService to extract insights from the full transcript
  const fullTranscript = chunks.map(chunk => chunk.text).join(' ');
  const { insights, rawExtractions } = await contentIntelligenceService.extractInsights(fullTranscript, title);

  // Return insights in the format expected by the pipeline
  return {
    insights,
    rawExtractions
  };
}

function validateEvidenceStage(title: string, transcript: string, rawInsights: any) {
  const startedAt = Date.now();
  const titleWords = new Set(title.toLowerCase().split(/\s+/).filter((word) => word.length > 3));
  const transcriptLower = transcript.toLowerCase();
  const insights = Array.isArray(rawInsights?.insights) ? rawInsights.insights : [];
  const validatedInsights = insights.filter((insight: any) => {
    const evidence = String(insight.evidence ?? "").trim();
    const text = String(insight.text ?? "").trim();
    if (evidence.length < 10 && text.length < 10) return false;

    const candidate = (evidence || text).toLowerCase();
    const candidateWords = candidate.split(/\s+/).filter((word) => word.length > 3);
    const titleWordHits = candidateWords.filter((word) => titleWords.has(word)).length;
    const titleDominated = candidateWords.length > 0 && titleWordHits / candidateWords.length > 0.7;
    if (titleDominated) return false;

    const evidenceNeedle = evidence.toLowerCase().slice(0, 120);
    return !evidenceNeedle || transcriptLower.includes(evidenceNeedle) || hasTranscriptWordOverlap(candidate, transcriptLower);
  });

  logPipelineStage("Evidence Validation", {
    status: validatedInsights.length > 0 ? "SUCCESS" : "FAILED",
    input: `Extracted insights=${insights.length}`,
    output: `Validated insights=${validatedInsights.length}`,
    length: validatedInsights.length,
    error: validatedInsights.length > 0 ? undefined : "No extracted facts had transcript-backed evidence.",
    startedAt,
  });

  if (validatedInsights.length === 0) {
    throw new Error("[Evidence Validation] stage failed: No extracted facts had transcript-backed evidence.");
  }

  return {
    ...rawInsights,
    insights: validatedInsights,
  };
}

function hasTranscriptWordOverlap(candidate: string, transcriptLower: string) {
  const words = Array.from(new Set(candidate.split(/\s+/).filter((word) => word.length > 5)));
  if (words.length === 0) return false;
  const hits = words.filter((word) => transcriptLower.includes(word)).length;
  return hits / words.length >= 0.5;
}

// STAGE 4: Knowledge Graph Building
async function buildKnowledgeGraphStage(title: string, rawInsights: any) {
  const { insights } = rawInsights || { insights: [] };

  if (!insights || insights.length === 0) {
    throw new Error("Knowledge Graph stage received zero insights.");
  }

  const knowledgeGraph = await contentIntelligenceService.buildKnowledgeGraph(insights);

  // Extract summary information for the pipeline
  const tldr = insights.length > 0 ? insights[0].text.substring(0, Math.min(200, insights[0].text.length)) : title;
  const takeaways = insights
    .slice(0, 5)
    .map((insight: any) => insight.text.substring(0, Math.min(150, insight.text.length)));
  const topics = Array.from(new Set<string>(
    insights
      .filter((insight: any) => insight.kind === 'topic')
      .map((insight: any) => insight.text),
  )).slice(0, 10);

  return {
    ...knowledgeGraph,
    tldr,
    takeaways,
    topics
  };
}

// STAGES 7-11: Content Generation Suite
async function generateSocialSuiteStage(options: {
  projectId: string;
  title: string;
  transcript: string;
  knowledgeGraph: any;
  [key: string]: any;
}) {
  const { title, transcript, knowledgeGraph, ...stageOptions } = options;

  // Run the full content intelligence pipeline
  const report = await contentIntelligenceService.runContentIntelligencePipeline(
    transcript,
    title,
    stageOptions.projectId || undefined,
    ["TWITTER", "LINKEDIN", "INSTAGRAM", "FACEBOOK", "THREADS", "CAROUSEL", "COMMUNITY", "STORY", "HOOKS", "CTA"],
    stageOptions.tonePref || "professional"
  );

  // Extract hooks (curiosity hooks) from the report
  const hooks = report.curiosityHooks.map((text: string, index: number) => ({
    id: `hook-${index}`,
    projectId: options.projectId,
    text,
    hookType: "Curiosity gap",
    reachScore: Math.min(100, Math.max(10, 80 + index)) // Decreasing reach score
  }));

  // Extract contents (platform-specific posts) from the report
  const contentsArray: any[] = [];
  const categories = report.categories || {};

  for (const categoryKey in categories) {
    if (Object.prototype.hasOwnProperty.call(categories, categoryKey)) {
      const categoryContents = categories[categoryKey as keyof typeof categories];
      if (Array.isArray(categoryContents)) {
        categoryContents.forEach((content: any, index: number) => {
          contentsArray.push({
            id: `${content.id || `content-${categoryKey}-${index}`}`,
            projectId: options.projectId,
            hookId: hooks.length > 0 ? hooks[0].id : undefined,
            platform: content.platform || "TWITTER", // Default platform
            contentType: `${content.platform} post`,
            body: content.body,
            originalBody: content.originalBody,
            tone: content.tone || "professional",
            approved: false,
            order: index
          });
        });
      }
    }
  }

  // If no contents were generated, throw an error
  if (contentsArray.length === 0) {
    throw new Error("Generation stage returned zero content pieces.");
  }

  return {
    hooks,
    contents: contentsArray
  };
}
