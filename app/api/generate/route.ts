import { getRequestUser } from "@/lib/auth";
import { generatePostSchema } from "@/lib/ai/schemas";
import { assertGenerationRateLimit } from "@/lib/rate-limit";
import { trackServerEvent } from "@/lib/analytics";
import { consumeCredits, creditErrorResponse, requireCredits } from "@/lib/credits";
import { sendContentReadyEmail } from "@/lib/email";
import {
  assertCanGenerateContent,
  planLimitErrorResponse,
  recordGeneratedContentUsage,
} from "@/lib/plan-limits";
import { PLAN_RULES } from "@/lib/plans";
import { prisma } from "@/lib/prisma/client";
import { recordUsageEvent } from "@/lib/usage";
import type { Platform, SocialOutput, Tone } from "@/lib/types";
import { getTranscript } from "@/lib/services/transcript";
import { extractInsights } from "@/lib/services/extractInsights";
import { generatePlatformOutputs } from "@/lib/ai/service";
import {
  generateTwitterPost,
  generateLinkedInPost,
  generateInstagramCaption,
  generateInstagramCarousel,
  generateFacebookPost,
  generateYouTubeCommunityPost,
} from "@/lib/services/generatePosts";
import {
  generateWithQualityGate,
} from "@/lib/services/qualityCheck";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

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

export async function GET(request: Request) {
  try {
    const user = await getRequestUser(request);
    await assertGenerationRateLimit(user.id);
    await requireCredits(user);

    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId") ?? "demo-founder-podcast";
    const platforms = url.searchParams.has("platforms")
      ? parsePlatforms(url.searchParams.get("platforms"))
      : PLAN_RULES[user.plan].outputPlatforms;
    const tone = (url.searchParams.get("tone") ?? "Professional") as Tone;
    const isRegeneration = url.searchParams.get("isRegeneration") === "true";
    await assertCanGenerateContent(user, platforms);
    const outputs = await generatePlatformOutputs({ projectId, platforms, tone, isRegeneration });
    await persistGeneratedOutputs({ userId: user.id, projectId, outputs, tone });
    await recordGeneratedContentUsage({
      userId: user.id,
      count: outputs.length,
      metadata: { projectId, platforms, tone },
    });
    await recordUsageEvent({
      userId: user.id,
      eventType: "content_generated",
      metadata: { projectId, platforms, tone },
    });
    await trackServerEvent("content_generated", {
      userId: user.id,
      projectId,
      metadata: { platforms: platforms.join(","), tone },
    });
    await consumeCredits(user);
    await notifyContentReady(user.id, projectId);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for (const output of outputs) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  platform: output.platform,
                  outputType: output.outputType,
                  content: output.content,
                  output,
                  done: false,
                })}\n\n`,
              ),
            );
            await new Promise((resolve) => setTimeout(resolve, 140));
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
        } catch {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                error: "Content generation is temporarily unavailable. Try again later.",
                code: "generation_failed",
              })}\n\n`,
            ),
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("GET /api/generate failed:", error);
    const planResponse = planLimitErrorResponse(error);
    if (planResponse) return planResponse;
    const creditResponse = creditErrorResponse(error);
    if (creditResponse) return creditResponse;
    return Response.json(
      {
        error: "Generation failed",
        code: "generation_failed",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request);
    await assertGenerationRateLimit(user.id);
    await requireCredits(user);
    const payload = generatePostSchema.parse(await request.json());
    await assertCanGenerateContent(user, payload.platforms);

    // STEP 0 — Get project by ID
    const { projectId, tone, platforms: selectedPlatforms } = payload;
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: user.id,
      },
    });

    if (!project) {
      return Response.json(
        {
          error: "Project not found",
          code: "project_not_found",
        },
        { status: 404 }
      );
    }

    // Validate that this is a YouTube project
    if (project.sourceType !== "youtube" || !project.sourceUrl) {
      return Response.json(
        {
          error: "Invalid project type or missing source URL",
          code: "invalid_project",
        },
        { status: 400 }
      );
    }

    // STEP 1 — Get transcript (from project if available, otherwise fetch from YouTube)
    const videoUrl = project.sourceUrl;
    let transcript: string | null = null;

    // First, try to use transcript already stored in project (from manual paste or earlier ingest)
    if (project.transcript && project.transcript.trim().length > 50) {
      transcript = project.transcript.trim();
    } else {
      // Fallback to fetching transcript from YouTube URL
      const transcriptResult = await getTranscript(videoUrl);
      if (transcriptResult.success) {
        transcript = transcriptResult.transcript ?? null;
      }
    }

    // If we still don't have a transcript, return error asking user to paste manually
    if (!transcript) {
      return Response.json(
        {
          error: 'NO_TRANSCRIPT',
          message: 'Could not retrieve this video\'s transcript. ' +
                    'Paste it manually to continue.',
        },
        { status: 422 }
      );
    }

    const outputs = await generatePlatformOutputs({
      projectId,
      platforms: selectedPlatforms,
      tone,
      isRegeneration: payload.isRegeneration ?? false,
    });
    await persistGeneratedOutputs({ userId: user.id, projectId, outputs, tone });

    const posts: Record<string, unknown> = {};
    outputs.forEach((output) => {
      posts[output.platform] = output.content;
    });

    // Record usage and send notifications
    await recordGeneratedContentUsage({
      userId: user.id,
      count: selectedPlatforms.length,
      metadata: { projectId, platforms: selectedPlatforms, tone },
    });
    await recordUsageEvent({
      userId: user.id,
      eventType: "content_generated",
      metadata: { videoUrl, platforms: selectedPlatforms, tone },
    });
    await trackServerEvent("content_generated", {
      userId: user.id,
      projectId,
      metadata: { platforms: selectedPlatforms.join(","), tone, videoUrl },
    });
    await consumeCredits(user);
    await notifyContentReady(user.id, projectId);

    return Response.json({ success: true, posts, insights_used: true });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("POST /api/generate failed:", error);
    const planResponse = planLimitErrorResponse(error);
    if (planResponse) return planResponse;
    const creditResponse = creditErrorResponse(error);
    if (creditResponse) return creditResponse;
    return Response.json(
      {
        error: "Generation failed",
        code: "generation_failed",
      },
      { status: 500 },
    );
  }
}

// Helper function to parse platforms string (from the original code)
function parsePlatforms(value: string | null): Platform[] {
  if (!value) return allPlatforms;
  const selected = value
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter((item): item is Platform => allPlatforms.includes(item as Platform));
  return selected.length ? selected : allPlatforms;
}

// Helper function to notify content ready (from the original code)
async function notifyContentReady(userId: string, projectId: string) {
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId, userId },
      select: {
        title: true,
        contents: {
          select: { platform: true },
        },
      },
    });

    if (!project) return;

    // Fetch user to check notification preference
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        notifyContentReady: true,
      },
    });

    if (!user?.notifyContentReady) return;

    const platforms = project.contents.map((c) => c.platform);
    await sendContentReadyEmail(
      user.email,
      project.title ?? "your Recastr project",
      Array.from(new Set(platforms)) // Deduplicate platforms
    );
  } catch (error) {
    console.error("notifyContentReady error:", error);
    return;
  }
}

async function persistGeneratedOutputs({
  userId,
  projectId,
  outputs,
  tone,
}: {
  userId: string;
  projectId: string;
  outputs: SocialOutput[];
  tone: Tone | string;
}) {
  if (outputs.length === 0) return;

  try {
    const { appendStoredOutputs } = await import("@/lib/projects/store");
    appendStoredOutputs(projectId, outputs);
  } catch (err) {
    console.error("Local cache save failed:", err);
  }

  try {
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
      select: {
        id: true,
        contents: {
          select: { order: true },
          orderBy: { order: "desc" },
          take: 1,
        },
      },
    });
    if (!project) return;

    const startOrder = (project.contents[0]?.order ?? -1) + 1;
    await prisma.$transaction(
      outputs.map((output, index) => {
        const body = stringifyGeneratedContent(output.content);
        const originalBody = stringifyGeneratedContent(output.originalContent ?? output.content);
        return prisma.content.upsert({
          where: { id: output.id },
          update: {
            platform: output.platform,
            contentType: output.outputType,
            body,
            originalBody,
            tone: String(output.tone ?? tone),
            approved: output.approved,
            order: startOrder + index,
          },
          create: {
            id: output.id,
            projectId,
            platform: output.platform,
            contentType: output.outputType,
            body,
            originalBody,
            tone: String(output.tone ?? tone),
            approved: output.approved,
            order: startOrder + index,
          },
        });
      }),
    );
  } catch (error) {
    console.error("persistGeneratedOutputs error:", error);
  }
}

function stringifyGeneratedContent(value: unknown) {
  if (typeof value === "string") return value;
  if (!value) return "";
  return JSON.stringify(value, null, 2);
}
