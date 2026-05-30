import { ChatOpenAI } from "@langchain/openai";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { nanoid } from "nanoid";
import { buildGenerationPrompt, chunkTranscript, SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { generatedArraySchema } from "@/lib/ai/schemas";
import { env } from "@/lib/env";
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
];

export async function generateContentSuite(
  request: GenerationRequest,
): Promise<SocialOutput[]> {
  const parser = StructuredOutputParser.fromZodSchema(generatedArraySchema);
  const formatInstructions = parser.getFormatInstructions();
  const transcriptChunks = chunkTranscript(request.transcript);

  if (env.openaiKey && !env.demoMode) {
    const model = new ChatOpenAI({
      model: "gpt-4o",
      temperature: 0.7,
      apiKey: env.openaiKey,
    });
    const platform = request.platform ?? "TWITTER";
    const prompt = [
      SYSTEM_PROMPT.replace("[TONE]", request.tone).replace("[AUDIENCE]", request.audience),
      buildGenerationPrompt({
        ...request,
        platform,
        transcript: transcriptChunks[0],
      }),
      formatInstructions,
    ].join("\n\n");

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await model.invoke(prompt + retryConstraint(attempt, platform));
      const parsed = await parser.parse(String(response.content));
      const outputs = parsed.map((item, index) =>
        toOutput(request.projectId ?? "generated", platform, `${platform} variation ${index + 1}`, item.content),
      );
      const valid = outputs.every((output) => validatePlatformLimit(output.platform, stringifyContent(output.content)));
      if (valid) return outputs;
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
    id: `${projectId}-${platform.toLowerCase()}-${nanoid(8)}`,
    projectId,
    platform,
    outputType,
    content,
    originalContent: content,
    tone: "Professional",
    approved: false,
    createdAt: new Date().toISOString(),
  };
}

function validatePlatformLimit(platform: Platform, text: string) {
  if (platform === "TWITTER") return text.length <= 2200;
  if (platform === "LINKEDIN") return text.length <= 3000;
  return true;
}

function retryConstraint(attempt: number, platform: Platform) {
  if (attempt === 0) return "";
  if (platform === "TWITTER") {
    return "\nRetry constraint: every single tweet must be under 280 characters.";
  }
  if (platform === "LINKEDIN") {
    return "\nRetry constraint: keep every LinkedIn post under 3000 characters.";
  }
  return "\nRetry constraint: make the JSON valid and keep copy concise.";
}
