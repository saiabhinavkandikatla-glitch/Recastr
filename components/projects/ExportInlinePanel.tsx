"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Portal } from "@radix-ui/react-portal";
import { Download, FileJson, FileText, Table } from "lucide-react";
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
];

export function ExportInlinePanel({
  contents,
  selectedIds,
  format,
  onFormatChange,
  onToggleContent,
  projectId,
  onClose,
}: {
  contents: ContentPiece[];
  selectedIds: string[];
  format: ExportFormat;
  onFormatChange: (format: ExportFormat) => void;
  onToggleContent: (id: string) => void;
  projectId: string;
  onClose: () => void;
}) {
  async function download() {
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
    <Portal>
      <motion.button
        aria-label="Close export menu"
        className="fixed inset-0 z-[80] cursor-default bg-transparent"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        type="button"
      />
      <motion.div
        initial={{ opacity: 0, y: -8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.98 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="fixed right-4 top-[calc(var(--topbar-height)+68px)] z-[90] max-h-[min(640px,calc(100vh-96px))] w-[min(900px,calc(100vw-32px))] overflow-hidden rounded-3xl border border-[var(--app-line)] bg-[var(--app-surface)] shadow-soft sm:right-6"
      >
      <div className="grid max-h-[inherit] gap-4 overflow-y-auto p-4 lg:grid-cols-[220px_1fr_220px]">
        <div className="space-y-2">
          {exportOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onFormatChange(option.value)}
              className={cn(
                "flex w-full items-center gap-2 rounded-xl border border-[var(--app-line)] bg-[var(--app-bg)]/55 px-3 py-2 text-sm text-muted-foreground transition hover:text-foreground",
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
              className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--app-line)] bg-[var(--app-bg)]/55 p-3 text-sm"
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
        <div className="rounded-2xl border border-[var(--app-line)] bg-[var(--app-bg)]/55 p-4">
          <p className="text-sm font-medium">Export preview</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {selectedIds.length} pieces will be exported as {format.toUpperCase()} with platform labels and source metadata.
          </p>
          <Button className="mt-4 w-full rounded-full bg-[var(--violet)] text-white hover:bg-[var(--violet-hover)]" onClick={download}>
            <Download className="h-4 w-4" />
            Download
          </Button>
        </div>
      </div>
      </motion.div>
    </Portal>
  );
}
