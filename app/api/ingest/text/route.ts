import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import sanitizeHtml from "sanitize-html";
import { nanoid } from "nanoid";
import { ensureUserRecord, getRequestUser } from "@/lib/auth";
import { ingestTextSchema } from "@/lib/ai/schemas";
import { apiError } from "@/lib/api/response";
import { consumeCredits, creditErrorResponse, requireCredits } from "@/lib/credits";
import { assertCanCreateProject, planLimitErrorResponse } from "@/lib/plan-limits";
import { summarizeTranscript } from "@/lib/ai/service";
import { prisma } from "@/lib/prisma/client";
import { getStoredProject } from "@/lib/projects/store";
import { addRecastrJob, jobNames } from "@/lib/queue/client";
import { assertIngestRateLimit } from "@/lib/rate-limit";
import type { SourceSummary } from "@/lib/types";

export const runtime = "nodejs";

const defaultSummary: SourceSummary = {
  tldr: "A pasted source is ready for hook extraction and platform-native content.",
  takeaways: [
    "Start with the clearest promise in the source.",
    "Turn the best lesson into multiple platform-native angles.",
    "Keep each output specific to the audience and format.",
  ],
  hooks: [
    "One source can become a complete content system.",
    "The best post is usually hiding in the strongest tension point.",
    "Repurpose the idea, not the exact wording.",
  ],
  detectedTone: "educational",
  topics: ["content repurposing", "creator workflow"],
  targetAudience: "Founders, creators, and content teams",
};

export async function POST(request: Request) {
  try {
    console.log('[DEBUG] /api/ingest/text POST - start');
    const user = await getRequestUser(request);
    console.log('[DEBUG] /api/ingest/text - user:', user?.id);
    await assertIngestRateLimit(user.id);
    console.log('[DEBUG] /api/ingest/text - rate limit passed');
    await requireCredits(user);
    console.log('[DEBUG] /api/ingest/text - credits passed');

    if (process.env.RECASTR_DEMO_MODE === "true") {
      const project = getStoredProject("demo-founder-podcast")!;
      await consumeCredits(user);
      return NextResponse.json({
        projectId: project.id,
        title: project.title,
        duration: 0,
        wordCount: project.wordCount ?? project.transcript.split(/\s+/).length,
        project,
      });
    }

    await assertCanCreateProject(user, "TEXT");
    console.log('[DEBUG] /api/ingest/text - can create project passed');

    const payload = await parseTextPayload(request);
    console.log('[DEBUG] /api/ingest/text - payload parsed, text length:', payload.text?.length, 'title:', payload.title);
    
    if (!payload.text || payload.text.trim().length < 20) {
      console.error('[ERROR] /api/ingest/text - text too short:', payload.text?.length);
      return NextResponse.json({ error: 'Text must be at least 20 characters', code: 'TEXT_TOO_SHORT' }, { status: 400 });
    }

    const cleanText = sanitizeHtml(payload.text, {
      allowedTags: [],
      allowedAttributes: {},
    })
      .replace(/\s+/g, " ")
      .trim()
      .split(/\s+/)
      .slice(0, 16_000)
      .join(" ");
    console.log('[DEBUG] /api/ingest/text - cleanText length:', cleanText.length);
    
    const summary = cleanText.length > 100 ? await summarizeTranscript(cleanText) : defaultSummary;
    console.log('[DEBUG] /api/ingest/text - summary generated, hooks:', summary.hooks?.length);
    const title = payload.title ?? `Imported source ${nanoid(5)}`;
    await ensureUserRecord(user);
    const project = await prisma.project.create({
      data: {
        userId: user.id,
        title,
        sourceType: "text",
        sourceText: cleanText,
        transcript: cleanText,
        summary: summary as Prisma.InputJsonValue,
        wordCount: cleanText.split(/\s+/).filter(Boolean).length,
        hooks: {
          create: summary.hooks.slice(0, 5).map((hook, index) => ({
            text: hook,
            hookType: index % 2 === 0 ? "Curiosity gap" : "Story",
            reachScore: 86 - index * 4,
          })),
        },
      },
      include: {
        hooks: true,
        contents: true,
      },
    });
    console.log('[DEBUG] /api/ingest/text - project created:', project.id);
    await addRecastrJob(jobNames.extractHooks, { projectId: project.id, userId: user.id });
    await consumeCredits(user);

    return NextResponse.json({
      projectId: project.id,
      title: project.title,
      duration: 0,
      wordCount: project.wordCount ?? 0,
      project,
    });
  } catch (error) {
    console.error('[ERROR] /api/ingest/text - caught error:', error);
    if (error instanceof Response) return error;
    const planResponse = planLimitErrorResponse(error);
    if (planResponse) return planResponse;
    const creditResponse = creditErrorResponse(error);
    if (creditResponse) return creditResponse;
    return apiError(error, "text_ingest_failed", 400);
  }
}

async function parseTextPayload(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  console.log('[DEBUG] parseTextPayload - contentType:', contentType);
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("file");
    const text =
      typeof form.get("text") === "string"
        ? String(form.get("text"))
        : file instanceof File
          ? await file.text()
          : "";
    console.log('[DEBUG] parseTextPayload - form text length:', text?.length);
    return ingestTextSchema.parse({
      title: typeof form.get("title") === "string" ? String(form.get("title")) : undefined,
      text,
    }) as { title?: string; text: string };
  }

  const body = await request.json();
  console.log('[DEBUG] parseTextPayload - json body keys:', Object.keys(body));
  return ingestTextSchema.parse(body) as { title?: string; text: string };
}
