import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureUserRecord, getRequestUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma/client";
import {
  projectShellSelect,
  projectWorkspaceSelect,
  serializeProject,
  serializeProjectShell,
} from "@/lib/projects/serialize";
import { apiError } from "@/lib/api/response";
import { recordAuditLog } from "@/lib/audit-log";
import { assertCanCreateProject, planLimitErrorResponse } from "@/lib/plan-limits";

export const runtime = "nodejs";

const createProjectSchema = z.object({
  title: z.string().trim().min(3).max(120),
  sourceType: z.enum(["YOUTUBE", "PODCAST", "BLOG", "TEXT"]).default("TEXT"),
  transcript: z.string().trim().max(100_000).default(""),
});

export async function GET(request: Request) {
  try {
    const user = await getRequestUser(request);
    const projects = await prisma.project.findMany({
      where: { userId: user.id },
      select: projectWorkspaceSelect,
      orderBy: { createdAt: "desc" },
      take: 10, // limit to 10 most recent
    });

    return NextResponse.json(projects.map(serializeProject));
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Error in GET /api/projects:", error);
    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request);
    const body = createProjectSchema.parse(await request.json());

    await assertCanCreateProject(user, body.sourceType);
    await ensureUserRecord(user);
    const project = await prisma.project.create({
      data: {
        userId: user.id,
        title: body.title,
        sourceType: body.sourceType.toLowerCase(),
        transcript: body.transcript,
        wordCount: body.transcript.split(/\s+/).filter(Boolean).length,
      },
      include: { contents: true, hooks: true },
    });
    await recordAuditLog({
      userId: user.id,
      action: "project_created",
      entityType: "project",
      entityId: project.id,
      metadata: { sourceType: body.sourceType },
      request,
    });

    return NextResponse.json(serializeProject(project), { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    const planResponse = planLimitErrorResponse(error);
    if (planResponse) return planResponse;
    return apiError(error, "project_create_failed", 400);
  }
}