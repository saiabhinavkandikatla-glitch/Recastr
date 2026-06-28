import { getYouTubeTranscript } from "@/lib/transcript";

/**
 * Compatibility wrapper for older API routes.
 * The real provider chain lives in `@/lib/transcript`.
 */
export async function getTranscript(videoUrl: string): Promise<{
  success: boolean;
  transcript?: string;
  error?: string;
  detail?: string;
}> {
  const result = await getYouTubeTranscript(videoUrl);
  if (result.success && result.transcript) {
    return { success: true, transcript: result.transcript };
  }

  return {
    success: false,
    error: result.code ?? "TRANSCRIPT_UNAVAILABLE",
    detail: result.reason ?? result.error ?? "Transcript unavailable.",
  };
}
