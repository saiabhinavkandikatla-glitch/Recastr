import { jsPDF } from "jspdf";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma/client";
import { isLocalDatabaseSetupError } from "@/lib/prisma/errors";
import { serializeProject } from "@/lib/projects/serialize";
import { getStoredProject } from "@/lib/projects/store";
import type { ContentPiece, Project, SocialOutput } from "@/lib/types";
import { stringifyContent } from "@/lib/utils";

export async function getExportProject(
  projectId: string,
  userId: string,
  contentIds: string[] = [],
): Promise<Project> {
  try {
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
      include: {
        contents: {
          include: { scheduledPost: true },
          orderBy: { order: "asc" },
        },
        hooks: true,
      },
    });

    if (project) return filterProjectContent(serializeProject(project), contentIds);
  } catch (error) {
    if (process.env.NODE_ENV === "production" && !isLocalDatabaseSetupError(error)) throw error;
  }

  if (env.demoMode || process.env.NODE_ENV !== "production") {
    const localProject = getStoredProject(projectId);
    if (localProject) return filterProjectContent(localProject, contentIds);
  }

  throw new Error(`Project ${projectId} was not found for export`);
}

export async function createCsv(projectId: string, userId: string, contentIds: string[] = []) {
  const project = await getExportProject(projectId, userId, contentIds);
  const rows = [
    ["project", "platform", "output_type", "content"],
    ...getExportRows(project).map((output) => [
      project.title,
      output.platform,
      output.outputType,
      stringifyContent(output.content).replace(/\r?\n/g, "\\n"),
    ]),
  ];
  return rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
}

export async function createJson(projectId: string, userId: string, contentIds: string[] = []) {
  return JSON.stringify(await getExportProject(projectId, userId, contentIds), null, 2);
}

export async function createPdf(projectId: string, userId: string, contentIds: string[] = []) {
  const project = await getExportProject(projectId, userId, contentIds);
  const doc = new jsPDF();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Recastr Social Content Report", 16, 18);
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(project.title, 16, 28);
  doc.setFontSize(10);
  doc.text(`Source: ${project.sourceType}`, 16, 36);

  let y = 48;
  getExportRows(project).forEach((output) => {
    if (y > 260) {
      doc.addPage();
      y = 18;
    }
    doc.setFont("helvetica", "bold");
    doc.text(`${output.platform} - ${output.outputType}`, 16, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(stringifyContent(output.content).slice(0, 900), 178);
    doc.text(lines, 16, y);
    y += Math.min(lines.length * 5 + 8, 74);
  });

  return Buffer.from(doc.output("arraybuffer"));
}

function getExportRows(project: Project): SocialOutput[] {
  if (project.outputs.length) return project.outputs;

  return (project.contents ?? []).map((content) => ({
    id: content.id,
    projectId: content.projectId,
    platform: content.platform,
    outputType: content.contentType,
    tone: content.tone,
    content: content.body,
    originalContent: content.originalBody,
    approved: content.approved,
    createdAt: content.createdAt,
  }));
}

function filterProjectContent(project: Project, contentIds: string[]) {
  if (!contentIds.length) return project;
  const selected = new Set(contentIds);

  const contents = project.contents?.filter((content) => selected.has(content.id));
  const outputs = project.outputs.filter((output) => selected.has(output.id));
  const outputFallback = contents?.map(contentToOutput) ?? [];

  return {
    ...project,
    contents,
    outputs: outputs.length ? outputs : outputFallback,
  };
}

function contentToOutput(content: ContentPiece): SocialOutput {
  return {
    id: content.id,
    projectId: content.projectId,
    platform: content.platform,
    outputType: content.contentType,
    tone: content.tone,
    content: content.body,
    originalContent: content.originalBody,
    approved: content.approved,
    createdAt: content.createdAt,
  };
}
