import { getGeminiClient } from "@/lib/ai/client";
import { YoutubeTranscript } from "youtube-transcript";
import axios from "axios";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma/client";
import { normalizePlatformCopy } from "@/lib/platform-limits";
import type { ContentPiece, Platform, SourceSummary, ViralHook, SourceType } from "@/lib/types";
import { hash } from "@/lib/ingest";
import * as cheerio from "cheerio";
import sanitizeHtml from "sanitize-html";
import ytdl from "yt-dlp-exec";

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

    // 3. yt-dlp subtitles
    if (!transcript) {
      console.log(`[pipeline:extract] Trying yt-dlp for subtitles...`);
      transcript = await fetchYtdlSubtitles(videoId);
    }

    // 4. Fallback to Gemini ingestion from video metadata description if transcript is completely blocked
    if (!transcript) {
      console.log(`[pipeline:extract] All automated methods failed, using video metadata description fallback...`);
      if (options.description?.trim()) {
        transcript = `[Video Title: ${options.title}]\n\nVideo Description:\n${options.description.trim()}`;
      } else {
        throw new Error(
          "Unable to retrieve subtitles automatically. We couldn't access subtitles for this video.\n\nPossible reasons:\n• Captions are disabled.\n• The video is private or restricted.\n• YouTube temporarily blocked transcript access.\n\nYou can paste a transcript manually or try another video."
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