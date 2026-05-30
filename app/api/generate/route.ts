import { getRequestUser } from "@/lib/auth";
import { generatePostSchema } from "@/lib/ai/schemas";
import { assertGenerationRateLimit } from "@/lib/rate-limit";
import { generatePlatformOutputs } from "@/lib/ai/service";
import { trackServerEvent } from "@/lib/analytics";
import { consumeCredits, creditErrorResponse, requireCredits } from "@/lib/credits";
import { sendContentReadyEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma/client";
import { recordUsageEvent } from "@/lib/usage";
import type { Platform, Tone } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allPlatforms: Platform[] = [
  "TWITTER",
  "LINKEDIN",
  "INSTAGRAM",
  "FACEBOOK",
  "THREADS",
  "YOUTUBE",
  "CAROUSEL",
  "COMMUNITY",
  "STORY",
];

export async function GET(request: Request) {
  try {
    const user = await getRequestUser(request);
    await assertGenerationRateLimit(user.id);
    await requireCredits(user);

    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId") ?? "demo-founder-podcast";
    const platforms = parsePlatforms(url.searchParams.get("platforms"));
    const tone = (url.searchParams.get("tone") ?? "Professional") as Tone;
    const outputs = await generatePlatformOutputs({ projectId, platforms, tone });
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
        } catch (error) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                error: error instanceof Error ? error.message : "generation_failed",
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
    const outputs = await generatePlatformOutputs({
      projectId: payload.projectId,
      platforms: payload.platforms,
      tone: payload.tone,
    });
    await recordUsageEvent({
      userId: user.id,
      eventType: "content_generated",
      metadata: {
        projectId: payload.projectId,
        platforms: payload.platforms,
        contentTypes: payload.contentTypes,
        tone: payload.tone,
      },
    });
    await trackServerEvent("content_generated", {
      userId: user.id,
      projectId: payload.projectId,
      metadata: { platforms: payload.platforms.join(","), tone: payload.tone },
    });
    await consumeCredits(user);
    await notifyContentReady(user.id, payload.projectId);

    const text = outputs.map((output) => stringifyContent(output.content)).join("\n\n---\n\n");
    return streamTokens(text);
  } catch (error) {
    if (error instanceof Response) return error;
    const creditResponse = creditErrorResponse(error);
    if (creditResponse) return creditResponse;
    return Response.json(
      {
        error: error instanceof Error ? error.message : "generation_failed",
        code: "generation_failed",
        status: 400,
      },
      { status: 400 },
    );
  }
}

function parsePlatforms(value: string | null): Platform[] {
  if (!value) return allPlatforms;
  const selected = value
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter((item): item is Platform => allPlatforms.includes(item as Platform));
  return selected.length ? selected : allPlatforms;
}

function streamTokens(text: string) {
  const encoder = new TextEncoder();
  const tokens = text.split(/(\s+)/).filter(Boolean);
  const stream = new ReadableStream({
    async start(controller) {
      for (const token of tokens) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`));
        await new Promise((resolve) => setTimeout(resolve, 30));
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

function stringifyContent(value: unknown) {
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

async function notifyContentReady(userId: string, projectId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        notifyContentReady: true,
        projects: {
          where: { id: projectId },
          select: { title: true },
          take: 1,
        },
      },
    });

    if (!user?.notifyContentReady) return;
    await sendContentReadyEmail(user.email, user.projects[0]?.title ?? "your Recastr project");
  } catch {
    return;
  }
}
