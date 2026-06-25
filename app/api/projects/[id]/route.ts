import { NextResponse } from "next/server";
import { z } from "zod";
import { getRequestUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma/client";
import { projectWorkspaceSelect, serializeProject } from "@/lib/projects/serialize";
import { getCachedProject } from "@/lib/projects/store";
import { apiError } from "@/lib/api/response";
import { recordAuditLog } from "@/lib/audit-log";

export const runtime = "nodejs";

const updateProjectTranscriptSchema = z.object({
  transcript: z.string(),
});

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  const user = await getRequestUser(request);
  try {
    const project = await prisma.project.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
      select: projectWorkspaceSelect,
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json(serializeProject(project));
  } catch {
    const storedProject = getCachedProject(params.id);
    if (storedProject) return NextResponse.json(storedProject);
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const user = await getRequestUser(request);
    const body = updateProjectTranscriptSchema.parse(await request.json());

    // Verify the project belongs to the user
    const existingProject = await prisma.project.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
    });

    if (!existingProject) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Update the transcript
    const wordCount = body.transcript.split(/\s+/).filter(Boolean).length;

    const project = await prisma.project.update({
      where: { id: params.id },
      data: {
        transcript: body.transcript,
        wordCount,
      },
      include: { contents: true, hooks: true },
    });

    await recordAuditLog({
      userId: user.id,
      action: "project_transcript_updated",
      entityType: "project",
      entityId: project.id,
      metadata: { transcriptLength: body.transcript.length },
      request,
    });

    return NextResponse.json(serializeProject(project));
  } catch (error) {
    if (error instanceof Response) return error;
    return apiError(error, "project_update_failed", 400);
  }
}
