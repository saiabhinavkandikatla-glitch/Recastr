import { generateGeminiText, getGeminiClient } from "@/lib/ai/client";
import { nanoid } from "nanoid";
import { buildGenerationPrompt, chunkTranscript, SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { generatedArraySchema } from "@/lib/ai/schemas";
import { env } from "@/lib/env";
import { getPlatformCharacterLimit, normalizePlatformCopy } from "@/lib/platform-limits";
import { getStoredProject } from "@/lib/projects/store";
import { stringifyContent } from "@/lib/utils";
import type { GenerationRequest, Platform, SocialOutput } from "@/lib/types";

const allPlatforms: Platform[] = [
  "TWITTER",
  "LINKEDIN",
  "INSTAGRAM",
  "FACEBOOK",
  "THREADS",
  "CAROUSEL",
  "COMMUNITY",
  "STORY",
  "HOOKS",
  "CTA",
];

export async function generateContentSuite(
  request: GenerationRequest,
): Promise<SocialOutput[]> {
  const transcriptChunks = chunkTranscript(request.transcript);

  if (env.geminiKey && !env.demoMode) {
    const gemini = getGeminiClient();
    if (gemini) {
      const platform = request.platform ?? "TWITTER";
      const systemInstructions = SYSTEM_PROMPT.replace("[TONE]", request.tone).replace("[AUDIENCE]", request.audience);
      const userPrompt = buildGenerationPrompt({
        ...request,
        platform,
        transcript: transcriptChunks[0],
      });
      const formatInstructions = `You must return a JSON array of objects. Each object must have: content (string), hook_score (number 1-10), estimated_engagement (string), platform_tips (array of strings). Return exactly 3 variations.`;
      const fullPrompt = `${systemInstructions}\n\n${userPrompt}\n\n${formatInstructions}`;

      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          const text = await generateGeminiText({
            model: "gemini-2.5-flash",
            prompt: fullPrompt + retryConstraint(attempt, platform),
            temperature: 0.7,
            responseMimeType: "application/json",
          });

          const parsed = generatedArraySchema.parse(JSON.parse(text || "[]"));
          const outputs = parsed.map((item, index) =>
            toOutput(
              request.projectId ?? "generated",
              platform,
              `${platform} variation ${index + 1}`,
              normalizeGeneratedContent(platform, item.content),
            ),
          );
          const valid = outputs.every((output) => validatePlatformLimit(output.platform, stringifyContent(output.content)));
          if (valid) return outputs;
        } catch (error) {
          console.error(`Gemini API Error (generateContentSuite attempt ${attempt + 1}):`, error);
          if (error instanceof Error && error.message.toLowerCase().includes("api key not valid")) {
            throw new Error("Invalid Gemini API Key - Please get a valid key starting with 'AIzaSy' from Google AI Studio.");
          }
          throw new Error("Failed to generate suite with Gemini. Please check your API key.");
        }
      }
    }
  }

  return createDemoOutputs(request);
}

function createDemoOutputs(request: GenerationRequest): SocialOutput[] {
  const sourceOutputs = request.projectId ? getStoredProject(request.projectId)?.outputs ?? [] : [];
  const platforms = request.platform ? [request.platform] : allPlatforms;

  return platforms.flatMap((platform) => {
    const existing = sourceOutputs.filter((output) => output.platform === platform);
    if (existing.length) {
      return existing.map((output) => ({
        ...output,
        id: `${output.id}-stream-${nanoid(6)}`,
        content: normalizeGeneratedContent(output.platform, output.content),
        tone: request.tone,
        approved: false,
        createdAt: new Date().toISOString(),
      }));
    }

    return [
      toOutput(
        request.projectId ?? "generated",
        platform,
        `${platform.toLowerCase()} pack`,
        {
          content:
            "Lead with the strongest idea from the source, keep the voice specific, and adapt the format to the platform before scheduling.",
          hook_score: 8,
          estimated_engagement: "Strong fit for educational audiences",
          platform_tips: ["Open with contrast", "Keep one CTA", "Preserve source specificity"],
        },
      ),
    ];
  });
}

function toOutput(
  projectId: string,
  platform: Platform,
  outputType: string,
  content: unknown,
): SocialOutput {
  return {
    id: `output-${nanoid(10)}`,
    projectId,
    platform,
    outputType,
    tone: "professional",
    content,
    originalContent: content,
    approved: false,
    createdAt: new Date().toISOString(),
  };
}

function retryConstraint(attempt: number, platform: Platform): string {
  if (attempt === 0) return "";
  const limit = getPlatformCharacterLimit(platform);
  return `\n\nIMPORTANT: Each variation must be strictly under ${limit} characters. This is attempt ${attempt + 1}.`;
}

function validatePlatformLimit(platform: Platform, content: string): boolean {
  const limit = getPlatformCharacterLimit(platform);
  return content.length <= limit * 1.15;
}

function normalizeGeneratedContent(platform: Platform, content: unknown): unknown {
  if (typeof content === "string") return normalizePlatformCopy(platform, content);
  if (content && typeof content === "object" && "content" in content) {
    const value = (content as { content?: unknown }).content;
    if (typeof value === "string") {
      return { ...content, content: normalizePlatformCopy(platform, value) };
    }
  }
  return content;
}
