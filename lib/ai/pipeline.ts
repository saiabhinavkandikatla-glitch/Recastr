import { getGeminiClient } from "@/lib/ai/client";
import { YoutubeTranscript } from "youtube-transcript";
import axios from "axios";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma/client";
import { normalizePlatformCopy } from "@/lib/platform-limits";
import type { ContentPiece, Platform, SourceSummary, ViralHook, SourceType, Project } from "@/lib/types";
import { hash, extractYouTubeVideoId } from "@/lib/ingest";
import * as cheerio from "cheerio";
import sanitizeHtml from "sanitize-html";
import ytdl from "yt-dlp-exec";
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

export async function runContentPipeline(options: PipelineOptions): Promise<{
  title: string;
  transcript: string;
  summary: SourceSummary;
  hooks: ViralHook[];
  contents: ContentPiece[];
}> {
  console.log(`[pipeline] Starting content intelligence pipeline for: ${options.url}`);

  // STAGE 1: Transcript Extraction
  const transcript = await extractTranscriptStage(options);
  const title = options.title || await extractTitleStage(options, transcript);
  const wordCount = transcript ? transcript.split(/\s+/).filter(Boolean).length : 0;
  console.log(`[INGESTION]\nTranscript length: ${transcript ? transcript.length : 0}\nWord count: ${wordCount}\nSuccess: ${!!transcript}`);
  if (!transcript || transcript.trim().length === 0) {
    throw new Error("[INGESTION] stage failed: Transcript is empty.");
  }

  // STAGE 2: Chunking
  const chunks = chunkTranscriptStage(title, transcript);
  console.log(`[CHUNKING]\nChunks created: ${chunks.length}\nChunk sizes: ${JSON.stringify(chunks.map(c => c.text.length))}`);
  if (!chunks || chunks.length === 0) {
    throw new Error("[CHUNKING] stage failed: Created zero chunks.");
  }

  // STAGE 3: Insight Extraction Engine (Fact Extraction)
  const rawInsights = await extractInsightsStage(title, chunks);
  const lessonsCount = rawInsights?.insights ? rawInsights.insights.filter((i: any) => i.kind === 'lesson' || i.kind === 'actionable_advice' || i.kind === 'surprising_fact').length : 0;
  const quotesCount = rawInsights?.insights ? rawInsights.insights.filter((i: any) => i.kind === 'quote').length : 0;
  const topicsCount = rawInsights?.insights ? rawInsights.insights.filter((i: any) => i.kind === 'topic').length : 0;
  console.log(`[FACT EXTRACTION]\nFacts extracted: ${lessonsCount}\nQuotes extracted: ${quotesCount}\nEntities extracted: ${topicsCount}`);
  if (!rawInsights || !rawInsights.insights || rawInsights.insights.length === 0) {
    throw new Error("[FACT EXTRACTION] stage failed: Extracted zero insights/facts.");
  }

  // STAGE 4: Knowledge Graph (Deduplication & Connections)
  const knowledgeGraph = await buildKnowledgeGraphStage(title, rawInsights);
  console.log(`[pipeline] Stage 4 Complete: Knowledge graph established`);

  // STAGE 5 onwards: Generation
  const { hooks, contents } = await generateSocialSuiteStage({
    projectId: `youtube-${hash(options.url).slice(0, 10)}-${options.userId}`,
    title,
    transcript,
    knowledgeGraph,
    options,
  });

  // Log generation stage details
  const factsSupplied = rawInsights?.insights ? rawInsights.insights.length : 0;
  const contextSize = chunks.map(c => c.text.length).reduce((a, b) => a + b, 0);
  const promptSize = contextSize + 500; // Estimated prompt templates length
  const generatedTokens = contents.map(c => c.body.length).reduce((a, b) => a + b, 0);
  console.log(`[GENERATION]\nFacts supplied to LLM: ${factsSupplied}\nContext size: ${contextSize}\nProvider used: Gemini\nPrompt version: v1\nGenerated tokens: ${generatedTokens}`);

  // STAGE 12: Final Output structure
  const summary: SourceSummary = {
    tldr: knowledgeGraph.tldr,
    takeaways: knowledgeGraph.takeaways.slice(0, 5),
    hooks: hooks.map(h => h.text),
    detectedTone: options.tonePref || "educational",
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
    const videoId = extractYouTubeVideoId(options.url);
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

    // 3. yt-dlp subtitles
    if (!transcript) {
      console.log(`[pipeline:extract] Trying yt-dlp for subtitles...`);
      transcript = await fetchYtdlSubtitles(videoId);
    }

    // 4. If transcript is completely blocked, throw an error
    if (!transcript) {
      throw new Error(
        "Unable to retrieve subtitles automatically. We couldn't access subtitles for this video.\n\nPossible reasons:\n• Captions are disabled.\n• The video is private or restricted.\n• YouTube temporarily blocked transcript access.\n\nYou can paste a transcript manually or try another video."
      );
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

async function fetchYtdlSubtitles(videoId: string): Promise<string | null> {
  try {
    console.log(`[pipeline:extract] Fetching subtitles via yt-dlp for videoId: ${videoId}`);

    // First, list available subtitles
    const { stdout: info } = await ytdl(`https://www.youtube.com/watch?v=${videoId}`, {
      dumpSingleJson: true,
      skipDownload: true,
    });

    const infoJson = JSON.parse(info);

    // Check if subtitles are available
    const hasSubtitles = infoJson.requestedSubtitles || infoJson.automatic_captions;
    if (!hasSubtitles) {
      console.log(`[pipeline:extract] No subtitles available via yt-dlp for videoId: ${videoId}`);
      return null;
    }

    // Try to get English subtitles first
    let subtitleUrl = null;
    let subtitleLang = null;

    // Check requested subtitles (user-uploaded)
    if (infoJson.requestedSubtitles) {
      const enSubtitle = infoJson.requestedSubtitles.en;
      if (enSubtitle) {
        subtitleUrl = enSubtitle.url;
        subtitleLang = 'en';
      }
    }

    // If no English requested subs, try automatic captions
    if (!subtitleUrl && infoJson.automatic_captions) {
      const enAuto = infoJson.automatic_captions['en'];
      if (enAuto) {
        subtitleUrl = enAuto.url;
        subtitleLang = 'en-auto';
      }
    }

    // If still no English, take whatever is available
    if (!subtitleUrl) {
      if (infoJson.requestedSubtitles) {
        const firstLang = Object.keys(infoJson.requestedSubtitles)[0];
        if (firstLang) {
          subtitleUrl = infoJson.requestedSubtitles[firstLang].url;
          subtitleLang = firstLang;
        }
      } else if (infoJson.automatic_captions) {
        const firstLang = Object.keys(infoJson.automatic_captions)[0];
        if (firstLang) {
          subtitleUrl = infoJson.automatic_captions[firstLang].url;
          subtitleLang = `${firstLang}-auto`;
        }
      }
    }

    if (!subtitleUrl) {
      console.log(`[pipeline:extract] No subtitle URL found via yt-dlp for videoId: ${videoId}`);
      return null;
    }

    // Fetch the subtitle content
    console.log(`[pipeline:extract] Downloading subtitles (lang: ${subtitleLang}) for videoId: ${videoId}`);
    const { text } = await ytdl(subtitleUrl);

    // Clean up the subtitle text (remove timing info, etc.)
    const cleanedText = text
      .replace(/<\d{2}:\d{2}:\d{2}\.\d{3}><\/\d{2}:\d{2}:\d{2}\.\d{3}>/g, '') // Remove XML-style tags
      .replace(/\[\d{2}:\d{2}:\d{2}\.\d{3}\]/g, '') // Remove timestamp brackets
      .replace(/\(\d{2}:\d{2}:\d{2}\.\d{3}\)/, '') // Remove parenthetical timestamps
      .replace(/^\s*[\d\-:]+\s*$/gm, '') // Remove lines that are just timestamps
      .replace(/^\s*$/gm, '') // Remove empty lines
      .trim();

    if (cleanedText.length > 50) { // Require at least 50 characters to be useful
      console.log(`[pipeline:extract] Successfully extracted ${cleanedText.length} characters of subtitles via yt-dlp`);
      return cleanedText;
    } else {
      console.log(`[pipeline:extract] Subtitles too short via yt-dlp: ${cleanedText.length} characters`);
      return null;
    }
  } catch (error) {
    console.error("[pipeline:extract] yt-dlp subtitle extraction failed:", error);
    return null;
  }
}

// Helper function to scrape watch page captions
async function scrapeWatchPageCaptions(videoId: string): Promise<string | null> {
  try {
    console.log(`[pipeline:extract] Scraping watch page captions for videoId: ${videoId}`);
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const res = await axios.get(watchUrl, {
      timeout: 8000,
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
    });

    const $ = cheerio.load(res.data);

    // Look for caption tracks in the page
    const captionTracks = $('ytmp3captionstrack');
    if (captionTracks.length > 0) {
      // This is a simplified approach - in reality, YouTube's caption extraction is more complex
      // For now, we'll return null to fall back to other methods
      console.log(`[pipeline:extract] Found caption tracks but implementation needed`);
      return null;
    }

    // Alternative: look for captions in player response
    const playerResponseMatch = res.data.match(/var ytInitialPlayerResponse = ({.+?});/);
    if (playerResponseMatch) {
      try {
        const playerResponse = JSON.parse(playerResponseMatch[1]);
        const captionTracks = playerResponse.captions?.playerCaptionsTracklistRenderer?.captionTracks;
        if (captionTracks && captionTracks.length > 0) {
          // Try to fetch the first English caption track
          const enTrack = captionTracks.find(track => track.languageCode === 'en');
          const trackToFetch = enTrack || captionTracks[0];

          if (trackToFetch && trackToFetch.baseUrl) {
            const captionRes = await axios.get(trackToFetch.baseUrl, {
              timeout: 5000
            });

            // Parse XML caption to plain text
            const $caption = cheerio.load(captionRes.data, { xmlMode: true });
            const text = $caption('p').text().trim();
            if (text.length > 50) {
              console.log(`[pipeline:extract] Successfully scraped ${text.length} characters of captions from watch page`);
              return text;
            }
          }
        }
      } catch (parseError) {
        console.error(`[pipeline:extract] Failed to parse player response for captions:`, parseError);
      }
    }

    console.log(`[pipeline:extract] No captions found via watch page scrape for videoId: ${videoId}`);
    return null;
  } catch (error) {
    console.error(`[pipeline:extract] Watch page caption scrape failed for videoId ${videoId}:`, error);
    return null;
  }
}

// Helper function to fetch transcript using youtube-transcript library
async function fetchWithYoutubeTranscriptLib(videoId: string): Promise<string | null> {
  try {
    console.log(`[pipeline:extract] Fetching transcript via youtube-transcript library for videoId: ${videoId}`);

    // Try to fetch transcript
    const segments = await YoutubeTranscript.fetchTranscript(videoId);

    if (segments && segments.length > 0) {
      const transcript = segments
        .map((segment) => segment.text.trim())
        .filter(Boolean)
        .join(" ");

      if (transcript.length > 50) {
        console.log(`[pipeline:extract] Successfully fetched ${transcript.length} characters via youtube-transcript library`);
        return transcript;
      }
    }

    console.log(`[pipeline:extract] No transcript found via youtube-transcript library for videoId: ${videoId}`);
    return null;
  } catch (error) {
    console.error(`[pipeline:extract] Youtube-transcript library fetch failed for videoId ${videoId}:`, error);
    return null;
  }
}

// Helper function to scrape blog/text content from URL
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
    .map(insight => insight.text.substring(0, Math.min(150, insight.text.length)));
  const topics = [...new Set(insights
    .filter(insight => insight.kind === 'topic')
    .map(insight => insight.text))
    .slice(0, 10)];

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
