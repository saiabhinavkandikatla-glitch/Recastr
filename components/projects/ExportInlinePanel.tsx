"use client";

import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Download, FileText, Table, FileJson, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { ContentPiece } from "@/lib/types";
import { type ExportFormat, platformLabels } from "./types";
import { toCardPlatform, formatContentType } from "./utils";
import { assertApiOk } from "@/lib/client-api";

const exportOptions: Array<{ value: ExportFormat; label: string; icon: ReactNode }> = [
  { value: "pdf", label: "PDF", icon: <FileText className="h-4 w-4" /> },
  { value: "csv", label: "CSV", icon: <Table className="h-4 w-4" /> },
  { value: "json", label: "JSON", icon: <FileJson className="h-4 w-4" /> },
  { value: "notion", label: "Notion", icon: <Mail className="h-4 w-4" /> },
];

export function ExportInlinePanel({
  contents,
  selectedIds,
  format,
  onFormatChange,
  onToggleContent,
  projectId,
}: {
  contents: ContentPiece[];
  selectedIds: string[];
  format: ExportFormat;
  onFormatChange: (format: ExportFormat) => void;
  onToggleContent: (id: string) => void;
  projectId: string;
}) {
  const [email, setEmail] = useState("");

  async function download() {
    if (format === "notion") {
      toast.info(email ? "Notion invite saved" : "Notion export is coming soon");
      return;
    }

    const response = await fetch(`/api/export/${format}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, contentIds: selectedIds }),
    });
    try {
      await assertApiOk(response);
    } catch (error) {
      if (error instanceof Error && error.message === "credit_exhausted") return;
      toast.error("Export failed");
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `recastr-${projectId}.${format}`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    toast.success(`${format.toUpperCase()} downloaded`);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, height: 0 }}
      animate={{ opacity: 1, y: 0, height: "auto" }}
      exit={{ opacity: 0, y: -10, height: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="mt-3 overflow-hidden rounded-[16px] border bg-card/90 shadow-sm"
    >
      <div className="grid gap-4 p-4 lg:grid-cols-[220px_1fr_220px]">
        <div className="space-y-2">
          {exportOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onFormatChange(option.value)}
              className={cn(
                "flex w-full items-center gap-2 rounded-[10px] border px-3 py-2 text-sm text-muted-foreground transition hover:text-foreground",
                format === option.value && "border-primary bg-primary/10 text-primary",
              )}
            >
              {option.icon}
              {option.label}
            </button>
          ))}
        </div>
        <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
          {contents.map((content) => (
            <label
              key={content.id}
              className="flex cursor-pointer items-start gap-3 rounded-[10px] border p-3 text-sm"
            >
              <input
                checked={selectedIds.includes(content.id)}
                className="mt-1 accent-violet-600"
                onChange={() => onToggleContent(content.id)}
                type="checkbox"
              />
              <span>
                <span className="block font-medium">
                  {platformLabels[toCardPlatform(content.platform)]} · {formatContentType(content.contentType)}
                </span>
                <span className="mt-1 line-clamp-2 block text-xs leading-5 text-muted-foreground">
                  {content.body}
                </span>
              </span>
            </label>
          ))}
        </div>
        <div className="rounded-[12px] border bg-muted/30 p-4">
          <p className="text-sm font-medium">Export preview</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {format === "notion"
              ? "Notion export is coming soon. Leave an email and we will wire it to your workspace."
              : `${selectedIds.length} pieces will be exported as ${format.toUpperCase()} with platform labels and source metadata.`}
          </p>
          {format === "notion" ? (
            <div className="mt-4 space-y-2">
              <input
                className="h-9 w-full rounded-[8px] border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                placeholder="you@company.com"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
          ) : null}
          <Button className="mt-4 w-full" onClick={download}>
            <Download className="h-4 w-4" />
            {format === "notion" ? "Join waitlist" : "Download"}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
