import { jsPDF } from "jspdf";
import { getStoredProject } from "@/lib/projects/store";
import type { Project } from "@/lib/types";
import { stringifyContent } from "@/lib/utils";

export function getExportProject(projectId: string): Project {
  const project = getStoredProject(projectId);
  if (!project) {
    throw new Error(`Project ${projectId} was not found for export`);
  }
  return project;
}

export function createCsv(projectId: string) {
  const project = getExportProject(projectId);
  const rows = [
    ["project", "platform", "output_type", "content"],
    ...project.outputs.map((output) => [
      project.title,
      output.platform,
      output.outputType,
      stringifyContent(output.content).replace(/\r?\n/g, "\\n"),
    ]),
  ];
  return rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
}

export function createJson(projectId: string) {
  return JSON.stringify(getExportProject(projectId), null, 2);
}

export function createPdf(projectId: string) {
  const project = getExportProject(projectId);
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
  project.outputs.slice(0, 8).forEach((output) => {
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
