import { Prisma } from "@prisma/client";
import { getRequestUser } from "@/lib/auth";
import { generatePostSchema } from "@/lib/ai/schemas";
import { assertGenerationRateLimit } from "@/lib/rate-limit";
import { trackServerEvent } from "@/lib/analytics";
import { consumeCredits, creditErrorResponse, requireCredits } from "@/lib/credits";
import {
  assertCanGenerateContent,
  planLimitErrorResponse,
  recordGeneratedContentUsage,
} from "@/lib/plan-limits";
import { prisma } from "@/lib/prisma/client";
import { getStoredProject, saveStoredProject } from "@/lib/projects/store";
import { recordUsageEvent } from "@/lib/usage";
import { generateV1SocialOutputs } from "@/lib/v1/social-generator";
import type { Platform, Project, SocialOutput, Tone } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const v1Platforms: Platform[] = [
  "LINKEDIN",
  "TWITTER",
  "INSTAGRAM",
  "THREADS",
  "FACEBOOK",
  "COMMUNITY",
  "CAROUSEL",
];

export async function GET(request: Request) {
  try {
    const user = await getRequestUser(request);
    await assertGenerationRateLimit(user.id);
    await requireCredits(user);

    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId");
    if (!projectId) {
      return Response.json({ error: "Project not found", code: "project_not_found" }, { status: 404 });
    }

    const platforms = parsePlatforms(url.searchParams.get("platforms"));
    const tone = (url.searchParams.get("tone") ?? "Professional") as Tone;
    const isRegeneration = url.searchParams.get("isRegeneration") === "true";
    await assertCanGenerateContent(user, platforms);

    const project = await loadProjectForGeneration(projectId, user.id);
    if (!project) {
      return Response.json({ error: "Project not found", code: "project_not_found" }, { status: 404 });
    }

    const sourceDocument = project.sourceText?.trim() || project.transcript?.trim();
    if (!sourceDocument) {
      return Response.json(
        {
          error: "No source document found. Analyze the YouTube URL again.",
          code: "source_missing",
        },
        { status: 422 },
      );
    }

    const outputs = await generateV1SocialOutputs({
      projectId,
      sourceDocument,
      platforms,
      tone,
      transcriptAvailable: !/Transcript:\s*Transcript unavailable/i.test(sourceDocument),
      isRegeneration,
      previousDrafts: isRegeneration ? await loadPreviousDrafts(projectId, user.id, platforms) : [],
    });

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
      metadata: { platforms: platforms.join(","), tone, architecture: "v1-one-pass" },
    });
    await consumeCredits(user);

    return streamOutputs(outputs);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("GET /api/generate failed:", error);

    const planResponse = planLimitErrorResponse(error);
    if (planResponse) return planResponse;

    const creditResponse = creditErrorResponse(error);
    if (creditResponse) return creditResponse;

    return Response.json(
      {
        error: "Content generation is temporarily unavailable. Check the AI provider configuration and try again.",
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

    const project = await loadProjectForGeneration(payload.projectId, user.id);
    if (!project) {
      return Response.json({ error: "Project not found", code: "project_not_found" }, { status: 404 });
    }

    const sourceDocument = project.sourceText?.trim() || project.transcript?.trim();
    if (!sourceDocument) {
      return Response.json({ error: "Source document missing", code: "source_missing" }, { status: 422 });
    }

    const outputs = await generateV1SocialOutputs({
      projectId: payload.projectId,
      sourceDocument,
      platforms: parsePlatforms(payload.platforms.join(",")),
      tone: payload.tone,
      transcriptAvailable: !/Transcript:\s*Transcript unavailable/i.test(sourceDocument),
      isRegeneration: payload.isRegeneration,
      previousDrafts: payload.isRegeneration
        ? await loadPreviousDrafts(payload.projectId, user.id, parsePlatforms(payload.platforms.join(",")))
        : [],
    });
    await persistGeneratedOutputs({ userId: user.id, projectId: payload.projectId, outputs, tone: payload.tone });
    await consumeCredits(user);

    return Response.json({
      success: true,
      posts: Object.fromEntries(outputs.map((output) => [output.platform, output.content])),
    });
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

function parsePlatforms(value: string | null): Platform[] {
  if (!value) return v1Platforms;
  const selected = value
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter((item): item is Platform => v1Platforms.includes(item as Platform));
  return selected.length ? selected : v1Platforms;
}

async function loadProjectForGeneration(projectId: string, userId: string): Promise<Project | null> {
  const dbProject = await prisma.project.findFirst({
    where: { id: projectId, userId },
    select: {
      id: true,
      userId: true,
      title: true,
      sourceUrl: true,
      sourceText: true,
      sourceType: true,
      thumbnailUrl: true,
      transcript: true,
      summary: true,
      duration: true,
      wordCount: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (dbProject) {
    // Normalize sourceType: DB stores lowercase ("youtube") but app-layer uses uppercase ("YOUTUBE")
    const rawSourceType = String(dbProject.sourceType ?? "TEXT").toUpperCase();
    const sourceType = (["YOUTUBE", "PODCAST", "BLOG", "TEXT"].includes(rawSourceType)
      ? rawSourceType
      : "TEXT") as Project["sourceType"];

    return {
      id: dbProject.id,
      userId: dbProject.userId,
      title: dbProject.title,
      sourceType,
      sourceUrl: dbProject.sourceUrl ?? undefined,
      thumbnailUrl: dbProject.thumbnailUrl ?? undefined,
      sourceText: dbProject.sourceText ?? undefined,
      transcript: dbProject.transcript ?? "",
      duration: dbProject.duration ?? undefined,
      wordCount: dbProject.wordCount ?? undefined,
      summary: (dbProject.summary as Project["summary"]) ?? {
        tldr: "Source ready for V1 generation.",
        takeaways: [],
        hooks: [],
        detectedTone: "educational",
        topics: [],
        targetAudience: "Creators",
      },
      hooks: [],
      contents: [],
      outputs: [],
      createdAt: dbProject.createdAt.toISOString(),
      updatedAt: dbProject.updatedAt.toISOString(),
      status: "DRAFT",
    };
  }

  return getStoredProject(projectId) ?? null;
}

async function loadPreviousDrafts(projectId: string, userId: string, platforms: Platform[]) {
  try {
    const rows = await prisma.content.findMany({
      where: {
        projectId,
        platform: { in: platforms },
        project: { userId },
      },
      select: { body: true },
      orderBy: { createdAt: "desc" },
      take: 12,
    });
    return rows.map((row) => row.body).filter(Boolean);
  } catch {
    const stored = getStoredProject(projectId);
    return (stored?.contents ?? [])
      .filter((content) => platforms.includes(content.platform))
      .map((content) => content.body)
      .filter(Boolean);
  }
}

function streamOutputs(outputs: SocialOutput[]) {
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
          await new Promise((resolve) => setTimeout(resolve, 100));
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
    const storedProject = getStoredProject(projectId);
    if (storedProject) {
      const contents = outputs.map((output, index) => ({
        id: output.id,
        projectId,
        platform: output.platform,
        contentType: output.outputType,
        body: stringifyGeneratedContent(output.content),
        originalBody: stringifyGeneratedContent(output.originalContent ?? output.content),
        tone: String(output.tone ?? tone),
        approved: output.approved,
        order: index,
        createdAt: output.createdAt,
      }));
      const outputPlatforms = new Set(outputs.map((output) => output.platform));
      const retainedContents = (storedProject.contents ?? []).filter(
        (content) => !outputPlatforms.has(content.platform),
      );
      const retainedOutputs = (storedProject.outputs ?? []).filter(
        (output) => !outputPlatforms.has(output.platform),
      );
      saveStoredProject({
        ...storedProject,
        contents: [...contents, ...retainedContents],
        outputs: [...outputs, ...retainedOutputs],
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("Local cache save failed:", error);
  }

  try {
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
      select: { id: true },
    });
    if (!project) return;
    const outputPlatforms = Array.from(new Set(outputs.map((output) => output.platform)));

    await prisma.$transaction([
      prisma.content.deleteMany({ where: { projectId, platform: { in: outputPlatforms } } }),
      ...outputs.map((output, index) => {
        const body = stringifyGeneratedContent(output.content);
        const originalBody = stringifyGeneratedContent(output.originalContent ?? output.content);
        return prisma.content.create({
          data: {
            id: output.id,
            projectId,
            platform: output.platform,
            contentType: output.outputType,
            body,
            originalBody,
            tone: String(output.tone ?? tone),
            approved: output.approved,
            order: index,
          },
        });
      }),
    ]);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return;
    console.error("persistGeneratedOutputs error:", error);
  }
}

function stringifyGeneratedContent(value: unknown) {
  if (typeof value === "string") return value;
  if (!value) return "";
  return JSON.stringify(value, null, 2);
}
