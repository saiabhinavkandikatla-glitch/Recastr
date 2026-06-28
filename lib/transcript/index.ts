import axios, { AxiosError } from "axios";
import { YoutubeTranscript } from "youtube-transcript";

const MIN_TRANSCRIPT_WORDS = 50;
type TranscriptProvider = "youtube-transcript" | "watch-page" | "nvidia-nim";

type TranscriptErrorCode =
  | "INVALID_URL"
  | "NO_CAPTIONS"
  | "PRIVATE_VIDEO"
  | "AGE_RESTRICTED"
  | "REGION_BLOCKED"
  | "VIDEO_UNAVAILABLE"
  | "LIVE_STREAM_UNSUPPORTED"
  | "TRANSCRIPT_DISABLED"
  | "PROVIDER_TIMEOUT"
  | "TRANSCRIPT_QUOTA_EXCEEDED"
  | "NETWORK_FAILURE"
  | "UNSUPPORTED_SOURCE"
  | "TRANSCRIPT_UNAVAILABLE";


type CaptionTrack = {
  baseUrl?: string;
  languageCode?: string;
  kind?: string;
  name?: {
    simpleText?: string;
    runs?: Array<{ text?: string }>;
  };
};

type ProviderResult = {
  provider: TranscriptProvider;
  transcript: string;
  durationMs: number;
};

type ProviderFailure = {
  provider: TranscriptProvider;
  code: TranscriptErrorCode;
  reason: string;
  durationMs: number;
};

export class TranscriptError extends Error {
  code: TranscriptErrorCode;
  provider: string;
  reason: string;
  failures: ProviderFailure[];

  constructor({
    code,
    reason,
    provider = "transcript",
    failures = [],
  }: {
    code: TranscriptErrorCode;
    reason: string;
    provider?: string;
    failures?: ProviderFailure[];
  }) {
    super(reason);
    this.name = "TranscriptError";
    this.code = code;
    this.provider = provider;
    this.reason = reason;
    this.failures = failures;
  }
}

export function extractVideoId(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl.trim());
    const host = parsed.hostname.replace(/^www\./, "").replace(/^m\./, "");

    if (host === "youtu.be") return sanitizeVideoId(parsed.pathname.split("/").filter(Boolean)[0]);

    const attributionTarget = parsed.searchParams.get("u");
    if (attributionTarget) {
      const decoded = decodeURIComponent(attributionTarget);
      const nested = decoded.startsWith("http") ? decoded : `https://www.youtube.com${decoded}`;
      const nestedId = extractVideoId(nested);
      if (nestedId) return nestedId;
    }

    if (host.endsWith("youtube.com") || host === "youtube-nocookie.com") {
      const directId = parsed.searchParams.get("v");
      if (directId) return sanitizeVideoId(directId);

      const parts = parsed.pathname.split("/").filter(Boolean);
      if (["shorts", "embed", "live", "v"].includes(parts[0] ?? "")) {
        return sanitizeVideoId(parts[1]);
      }
    }
  } catch {
    const looseMatch = rawUrl.match(/(?:v=|youtu\.be\/|shorts\/|embed\/|live\/)([A-Za-z0-9_-]{11})/);
    return sanitizeVideoId(looseMatch?.[1]);
  }

  return null;
}

export function normalizeYoutubeUrl(rawUrl: string): string {
  const videoId = extractVideoId(rawUrl);
  if (!videoId) {
    throw new TranscriptError({
      code: "INVALID_URL",
      provider: "url-normalizer",
      reason: "Invalid YouTube URL. Supported formats include youtube.com, m.youtube.com, youtu.be, shorts, live, and embed URLs.",
    });
  }
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export async function getYouTubeTranscript(videoUrl: string): Promise<{
  success: boolean;
  transcript?: string;
  provider?: string;
  videoId?: string;
  normalizedUrl?: string;
  error?: string;
  code?: TranscriptErrorCode;
  reason?: string;
  failures?: ProviderFailure[];
}> {
  try {
    const normalizedUrl = normalizeYoutubeUrl(videoUrl);
    const videoId = extractVideoId(normalizedUrl);
    if (!videoId) {
      throw new TranscriptError({ code: "INVALID_URL", provider: "url-normalizer", reason: "Unable to extract a YouTube video ID." });
    }

    console.log(`[Transcript] Incoming URL: ${videoUrl}`);
    console.log(`[Transcript] Normalized URL: ${normalizedUrl}`);
    console.log(`[Transcript] Video ID: ${videoId}`);

    const result = await fetchTranscriptResult(normalizedUrl, videoId);
    return {
      success: true,
      transcript: result.transcript,
      provider: result.provider,
      videoId,
      normalizedUrl,
    };
  } catch (error) {
    const transcriptError = toTranscriptError(error, "transcript");
    return {
      success: false,
      error: transcriptError.reason,
      code: transcriptError.code,
      reason: transcriptError.reason,
      provider: transcriptError.provider,
      failures: transcriptError.failures,
    };
  }
}

export async function fetchTranscript(videoIdOrUrl: string): Promise<string> {
  const normalizedUrl = normalizeYoutubeUrl(videoIdOrUrl);
  const videoId = extractVideoId(normalizedUrl);
  if (!videoId) {
    throw new TranscriptError({ code: "INVALID_URL", provider: "url-normalizer", reason: "Unable to extract a YouTube video ID." });
  }
  const result = await fetchTranscriptResult(normalizedUrl, videoId);
  return result.transcript;
}

async function fetchTranscriptResult(videoUrl: string, videoId: string): Promise<ProviderResult> {
  const failures: ProviderFailure[] = [];
  const lightweightProviders: Array<() => Promise<ProviderResult>> = [
    () => runProvider("youtube-transcript", () => fetchWithYoutubeTranscriptLib(videoId), 7000),
    () => runProvider("watch-page", () => scrapeWatchPageCaptions(videoUrl), 8000),
  ];

  const lightResult = await firstSuccessfulProvider(lightweightProviders, failures);
  if (lightResult) return lightResult;

  const dominant = chooseDominantFailure(failures);
  console.error("[Transcript] All providers failed:", JSON.stringify(failures));
  throw new TranscriptError({
    code: dominant.code,
    provider: dominant.provider,
    reason: dominant.reason,
    failures,
  });
}

function firstSuccessfulProvider(
  providers: Array<() => Promise<ProviderResult>>,
  failures: ProviderFailure[],
): Promise<ProviderResult | null> {
  return new Promise((resolve) => {
    let pending = providers.length;
    for (const provider of providers) {
      provider().then(
        (result) => resolve(result),
        (error) => {
          failures.push(toProviderFailure(error));
          pending -= 1;
          if (pending === 0) resolve(null);
        },
      );
    }
  });
}

async function runProvider(
  provider: TranscriptProvider,
  fetcher: () => Promise<string>,
  timeoutMs: number,
): Promise<ProviderResult> {
  const startedAt = Date.now();
  console.log(`[Transcript Provider] START provider=${provider}`);
  try {
    const transcript = await withTimeout(
      withRetry(fetcher, {
        retries: provider === "nvidia-nim" ? 0 : 2,
        provider,
      }),
      timeoutMs,
      provider,
    );
    const normalized = normalizeAndValidateTranscript(transcript, provider);
    const durationMs = Date.now() - startedAt;
    console.log(`[Transcript Provider] SUCCESS provider=${provider} duration=${durationMs}ms length=${normalized.length} words=${wordCount(normalized)}`);
    return { provider, transcript: normalized, durationMs };
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    const classified = toTranscriptError(error, provider);
    console.error(`[Transcript Provider] FAILED provider=${provider} duration=${durationMs}ms code=${classified.code} reason=${classified.reason}`);
    throw new TranscriptError({
      code: classified.code,
      provider,
      reason: classified.reason,
      failures: [{ provider, code: classified.code, reason: classified.reason, durationMs }],
    });
  }
}

async function fetchWithYoutubeTranscriptLib(videoId: string): Promise<string> {
  const segments = await YoutubeTranscript.fetchTranscript(videoId);
  if (!segments?.length) {
    throw new TranscriptError({ code: "NO_CAPTIONS", provider: "youtube-transcript", reason: "youtube-transcript returned no caption segments." });
  }
  return segments.map((segment) => segment.text?.trim() ?? "").filter(Boolean).join(" ");
}

async function scrapeWatchPageCaptions(videoUrl: string): Promise<string> {
  const response = await axios.get<string>(videoUrl, {
    headers: browserHeaders(),
    timeout: 5500,
    validateStatus: () => true,
  });

  if (response.status === 404 || response.status === 410) {
    throw new TranscriptError({ code: "VIDEO_UNAVAILABLE", provider: "watch-page", reason: `YouTube watch page returned ${response.status}.` });
  }
  if (response.status === 429) {
    throw new TranscriptError({ code: "TRANSCRIPT_QUOTA_EXCEEDED", provider: "watch-page", reason: "YouTube watch page rate limited the request." });
  }
  if (response.status < 200 || response.status >= 300) {
    throw new TranscriptError({ code: "NETWORK_FAILURE", provider: "watch-page", reason: `YouTube watch page returned HTTP ${response.status}.` });
  }

  const html = response.data;
  classifyWatchPageAvailability(html);
  const tracks = extractCaptionTracks(html);
  if (!tracks.length) {
    throw new TranscriptError({ code: "NO_CAPTIONS", provider: "watch-page", reason: "No caption tracks found in the YouTube watch page." });
  }

  const track = pickCaptionTrack(tracks);
  if (!track?.baseUrl) {
    throw new TranscriptError({ code: "NO_CAPTIONS", provider: "watch-page", reason: "Selected caption track had no caption URL." });
  }

  for (const url of captionUrlCandidates(track)) {
    try {
      const captionResponse = await axios.get<unknown>(url, {
        headers: browserHeaders(),
        timeout: 4500,
        validateStatus: (status) => status >= 200 && status < 300,
      });
      const text = typeof captionResponse.data === "string"
        ? parseCaptionText(captionResponse.data)
        : parseJsonCaption(captionResponse.data);
      if (wordCount(text) >= MIN_TRANSCRIPT_WORDS) return text;
    } catch (error) {
      console.warn(`[Transcript Provider] watch-page caption URL failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  throw new TranscriptError({ code: "NO_CAPTIONS", provider: "watch-page", reason: "Caption tracks existed, but none returned usable transcript text." });
}

async function fetchTranscriptWithNIM(videoUrl: string, videoId: string): Promise<string> {
  throw new TranscriptError({
    code: "NO_CAPTIONS",
    provider: "nvidia-nim",
    reason: "Transcript web search fallback is not supported on NVIDIA NIM.",
  });
}

async function withRetry<T>(
  fn: () => Promise<T>,
  { retries, provider }: { retries: number; provider: TranscriptProvider },
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const transcriptError = toTranscriptError(error, provider);
      if (!isRetryable(transcriptError) || attempt === retries) break;
      const backoffMs = 350 * 2 ** attempt;
      console.warn(`[Transcript Provider] retry provider=${provider} attempt=${attempt + 1} backoff=${backoffMs}ms code=${transcriptError.code}`);
      await delay(backoffMs);
    }
  }
  throw lastError;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, provider: TranscriptProvider): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new TranscriptError({ code: "PROVIDER_TIMEOUT", provider, reason: `${provider} timed out after ${timeoutMs}ms.` }));
    }, timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeout);
        reject(error);
      },
    );
  });
}

function toTranscriptError(error: unknown, provider: string): TranscriptError {
  if (error instanceof TranscriptError) return error;

  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  let code: TranscriptErrorCode = "TRANSCRIPT_UNAVAILABLE";
  if (lower.includes("private")) code = "PRIVATE_VIDEO";
  else if (lower.includes("age") && lower.includes("restrict")) code = "AGE_RESTRICTED";
  else if (lower.includes("region") || lower.includes("geo")) code = "REGION_BLOCKED";
  else if (lower.includes("live")) code = "LIVE_STREAM_UNSUPPORTED";
  else if (lower.includes("not a bot") || lower.includes("unusual traffic")) code = "NETWORK_FAILURE";
  else if (lower.includes("disabled")) code = "TRANSCRIPT_DISABLED";
  else if (lower.includes("caption") || lower.includes("subtitle") || lower.includes("transcript")) code = "NO_CAPTIONS";
  else if (lower.includes("quota") || lower.includes("429") || lower.includes("too many")) code = "TRANSCRIPT_QUOTA_EXCEEDED";
  else if (lower.includes("timeout") || lower.includes("timed out")) code = "PROVIDER_TIMEOUT";
  else if (isAxiosNetworkError(error)) code = "NETWORK_FAILURE";

  return new TranscriptError({ code, provider, reason: message });
}

function toProviderFailure(error: unknown): ProviderFailure {
  const transcriptError = toTranscriptError(error, "transcript");
  const nested = transcriptError.failures[0];
  return nested ?? {
    provider: transcriptError.provider as TranscriptProvider,
    code: transcriptError.code,
    reason: transcriptError.reason,
    durationMs: 0,
  };
}

function chooseDominantFailure(failures: ProviderFailure[]): ProviderFailure {
  const priority: TranscriptErrorCode[] = [
    "INVALID_URL",
    "PRIVATE_VIDEO",
    "AGE_RESTRICTED",
    "REGION_BLOCKED",
    "VIDEO_UNAVAILABLE",
    "LIVE_STREAM_UNSUPPORTED",
    "TRANSCRIPT_QUOTA_EXCEEDED",
    "NETWORK_FAILURE",
    "TRANSCRIPT_DISABLED",
    "NO_CAPTIONS",
    "PROVIDER_TIMEOUT",
  ];
  return (
    priority.map((code) => failures.find((failure) => failure.code === code)).find(Boolean) ??
    failures[0] ?? {
      provider: "nvidia-nim",
      code: "TRANSCRIPT_UNAVAILABLE",
      reason: "All transcript providers failed.",
      durationMs: 0,
    }
  );
}

function isRetryable(error: TranscriptError) {
  return ["NETWORK_FAILURE", "PROVIDER_TIMEOUT", "TRANSCRIPT_QUOTA_EXCEEDED", "TRANSCRIPT_UNAVAILABLE"].includes(error.code);
}

function isAxiosNetworkError(error: unknown) {
  return axios.isAxiosError(error) && !((error as AxiosError).response?.status);
}

function classifyWatchPageAvailability(html: string) {
  const playerResponse = extractInitialPlayerResponse(html);
  const playability = playerResponse?.playabilityStatus;
  const playabilityStatus = playability?.status?.toUpperCase();
  const playabilityReason = [
    playability?.reason,
    ...(playability?.messages ?? []),
  ].filter(Boolean).join(" ");

  if (playerResponse?.videoDetails?.isLiveContent) {
    throw new TranscriptError({ code: "LIVE_STREAM_UNSUPPORTED", provider: "watch-page", reason: "Live stream captions are not available for analysis yet." });
  }

  if (playabilityStatus && playabilityStatus !== "OK") {
    throw classifyPlayabilityFailure(playabilityStatus, playabilityReason);
  }

  const lower = html.toLowerCase();
  if (lower.includes("this video is private") || lower.includes("private video")) {
    throw new TranscriptError({ code: "PRIVATE_VIDEO", provider: "watch-page", reason: "YouTube reports this is a private video." });
  }
  if (lower.includes("confirm your age") || lower.includes("age-restricted")) {
    throw new TranscriptError({ code: "AGE_RESTRICTED", provider: "watch-page", reason: "YouTube requires age verification for this video." });
  }
  if (lower.includes("not available in your country")) {
    throw new TranscriptError({ code: "REGION_BLOCKED", provider: "watch-page", reason: "YouTube reports this video is region blocked." });
  }
  if (lower.includes('"islivecontent":true')) {
    throw new TranscriptError({ code: "LIVE_STREAM_UNSUPPORTED", provider: "watch-page", reason: "Live stream captions are not available for analysis yet." });
  }
}

function classifyPlayabilityFailure(status: string, reason: string) {
  const lowerReason = reason.toLowerCase();
  if (lowerReason.includes("not a bot") || lowerReason.includes("unusual traffic")) {
    return new TranscriptError({ code: "NETWORK_FAILURE", provider: "watch-page", reason: reason || "YouTube blocked this provider with a bot challenge." });
  }
  if (status === "LOGIN_REQUIRED" && lowerReason.includes("age")) {
    return new TranscriptError({ code: "AGE_RESTRICTED", provider: "watch-page", reason: reason || "YouTube requires age verification for this video." });
  }
  if (status === "LOGIN_REQUIRED" || lowerReason.includes("private")) {
    return new TranscriptError({ code: "PRIVATE_VIDEO", provider: "watch-page", reason: reason || "YouTube reports this is a private video." });
  }
  if (lowerReason.includes("country") || lowerReason.includes("region")) {
    return new TranscriptError({ code: "REGION_BLOCKED", provider: "watch-page", reason: reason || "YouTube reports this video is region blocked." });
  }
  if (lowerReason.includes("live")) {
    return new TranscriptError({ code: "LIVE_STREAM_UNSUPPORTED", provider: "watch-page", reason: reason || "Live stream captions are not available for analysis yet." });
  }
  return new TranscriptError({ code: "VIDEO_UNAVAILABLE", provider: "watch-page", reason: reason || `YouTube playability status is ${status}.` });
}

function extractInitialPlayerResponse(html: string): {
  playabilityStatus?: { status?: string; reason?: string; messages?: string[] };
  videoDetails?: { isLiveContent?: boolean };
} | null {
  const markers = ["ytInitialPlayerResponse = ", "ytInitialPlayerResponse=", "window[\"ytInitialPlayerResponse\"] = "];
  for (const marker of markers) {
    const rawResponse = extractBalancedObjectAfter(html, marker);
    if (!rawResponse) continue;
    try {
      return JSON.parse(rawResponse);
    } catch {
      continue;
    }
  }
  return null;
}

function normalizeAndValidateTranscript(raw: string, provider: string) {
  const transcript = normalizeTranscript(raw);
  const words = wordCount(transcript);
  console.log(`[Transcript Normalizer] provider=${provider} rawChars=${raw?.length ?? 0} normalizedChars=${transcript.length} words=${words}`);
  if (words < MIN_TRANSCRIPT_WORDS) {
    throw new TranscriptError({ code: "NO_CAPTIONS", provider, reason: `Transcript is too short after normalization (${words} words; minimum is ${MIN_TRANSCRIPT_WORDS}).` });
  }
  return transcript;
}

function normalizeTranscript(value: string) {
  return decodeHtml(value ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function wordCount(value: string) {
  return value.split(/\s+/).filter(Boolean).length;
}

function sanitizeVideoId(value: string | undefined | null) {
  const match = value?.match(/^[A-Za-z0-9_-]{11}/);
  return match?.[0] ?? null;
}

function browserHeaders() {
  return {
    Accept: "text/html,application/json,text/plain,*/*",
    "Accept-Language": "en-US,en;q=0.9",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
  };
}

function extractCaptionTracks(html: string): CaptionTrack[] {
  const rawTracks = extractBalancedJsonAfter(html, '"captionTracks":');
  if (!rawTracks) return [];
  try {
    const parsed = JSON.parse(rawTracks) as unknown;
    return Array.isArray(parsed) ? parsed.filter(isCaptionTrack) : [];
  } catch {
    return [];
  }
}

function extractBalancedJsonAfter(value: string, marker: string) {
  const markerIndex = value.indexOf(marker);
  if (markerIndex === -1) return "";
  const start = value.indexOf("[", markerIndex);
  if (start === -1) return "";
  return extractBalancedValueFrom(value, start, "[", "]");
}

function extractBalancedObjectAfter(value: string, marker: string) {
  const markerIndex = value.indexOf(marker);
  if (markerIndex === -1) return "";
  const start = value.indexOf("{", markerIndex);
  if (start === -1) return "";
  return extractBalancedValueFrom(value, start, "{", "}");
}

function extractBalancedValueFrom(value: string, start: number, openChar: string, closeChar: string) {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < value.length; index += 1) {
    const char = value[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (char === openChar) depth += 1;
    if (char === closeChar) {
      depth -= 1;
      if (depth === 0) return value.slice(start, index + 1);
    }
  }
  return "";
}

function isCaptionTrack(value: unknown): value is CaptionTrack {
  return typeof value === "object" && value !== null && "baseUrl" in value;
}

function pickCaptionTrack(tracks: CaptionTrack[]) {
  return (
    tracks.find((track) => track.languageCode?.startsWith("en") && track.kind !== "asr") ||
    tracks.find((track) => track.languageCode?.startsWith("en")) ||
    tracks.find((track) => track.kind !== "asr") ||
    tracks[0]
  );
}

function captionUrlCandidates(track: CaptionTrack) {
  if (!track.baseUrl) return [];
  const urls = [
    withCaptionFormat(track.baseUrl, "json3"),
    withCaptionFormat(track.baseUrl, "vtt"),
  ];
  if (track.languageCode && !track.languageCode.startsWith("en")) {
    urls.unshift(withCaptionFormat(addCaptionParam(track.baseUrl, "tlang", "en"), "json3"));
    urls.push(withCaptionFormat(addCaptionParam(track.baseUrl, "tlang", "en"), "vtt"));
  }
  urls.push(track.baseUrl);
  return Array.from(new Set(urls));
}

function withCaptionFormat(baseUrl: string, format: "json3" | "vtt") {
  const separator = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${separator}fmt=${format}`;
}

function addCaptionParam(baseUrl: string, key: string, value: string) {
  const separator = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${separator}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
}

function parseJsonCaption(payload: unknown) {
  if (!payload || typeof payload !== "object" || !("events" in payload)) return "";
  const events = (payload as { events?: unknown }).events;
  if (!Array.isArray(events)) return "";
  return normalizeTranscript(
    events
      .flatMap((event) => {
        if (!event || typeof event !== "object" || !("segs" in event)) return [];
        const segments = (event as { segs?: unknown }).segs;
        if (!Array.isArray(segments)) return [];
        return segments.map((segment) => {
          if (!segment || typeof segment !== "object" || !("utf8" in segment)) return "";
          return String((segment as { utf8?: unknown }).utf8 ?? "");
        });
      })
      .join(" "),
  );
}

function parseCaptionText(raw: string) {
  if (!raw.trim()) return "";
  const xmlLines = Array.from(raw.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)).map((match) => decodeHtml(match[1] ?? ""));
  if (xmlLines.length > 0) return normalizeTranscript(xmlLines.join(" "));
  return normalizeTranscript(
    raw
      .replace(/^WEBVTT[\s\S]*?\n\n/i, " ")
      .replace(/\d{1,2}:\d{2}:\d{2}\.\d{3}\s+-->\s+\d{1,2}:\d{2}:\d{2}\.\d{3}[^\n]*/g, " ")
      .replace(/<[^>]+>/g, " "),
  );
}

function decodeHtml(value: string) {
  const entities: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    "#39": "'",
  };
  return value.replace(/&([^;]+);/g, (match, entity: string) => {
    if (entities[entity]) return entities[entity];
    if (entity.startsWith("#x")) return String.fromCharCode(Number.parseInt(entity.slice(2), 16));
    if (entity.startsWith("#")) return String.fromCharCode(Number.parseInt(entity.slice(1), 10));
    return match;
  });
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

