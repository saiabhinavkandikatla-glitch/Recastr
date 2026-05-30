"use client";

import type React from "react";
import { useState } from "react";
import { Download, FileJson, FileText, Table, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ExportFormat = "pdf" | "csv" | "json" | "notion";

const formats: Array<[ExportFormat, string, React.ReactNode]> = [
  ["pdf", "PDF", <FileText key="pdf" className="h-4 w-4" />],
  ["csv", "CSV", <Table key="csv" className="h-4 w-4" />],
  ["json", "JSON", <FileJson key="json" className="h-4 w-4" />],
  ["notion", "Notion", <FileText key="notion" className="h-4 w-4" />],
];

export function ExportModal({
  open,
  projectId,
  onClose,
}: {
  open: boolean;
  projectId: string;
  onClose: () => void;
}) {
  const [format, setFormat] = useState<ExportFormat>("pdf");
  if (!open) return null;

  async function download() {
    if (format === "notion") {
      toast.info("Notion export is coming soon");
      return;
    }
    const response = await fetch(`/api/export/${format}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, contentIds: [] }),
    });
    if (!response.ok) {
      toast.error("Export failed");
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const disposition = response.headers.get("Content-Disposition") ?? "";
    const fallbackName = `recastr-${projectId}.${format}`;
    const fileName = disposition.match(/filename="([^"]+)"/)?.[1] ?? fallbackName;
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    toast.success(`${format.toUpperCase()} downloaded`);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/80 p-4 backdrop-blur">
      <Card className="w-full max-w-2xl border-white/10 bg-card/95">
        <CardHeader className="flex-row items-center justify-between border-b">
          <CardTitle>Export content pack</CardTitle>
          <Button aria-label="Close export modal" size="icon" variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {formats.map(([value, label, icon]) => (
              <button
                key={value}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-[10px] border px-3 py-2 text-sm",
                  format === value && "border-primary bg-primary/10 text-primary",
                )}
                onClick={() => setFormat(value)}
                type="button"
              >
                {icon}
                {label}
              </button>
            ))}
          </div>
          <div className="rounded-[16px] border bg-muted/30 p-4 text-sm leading-6 text-muted-foreground">
            {format === "notion"
              ? "Notion export is coming soon. PDF, CSV, and JSON are available now."
              : "The export includes project name, source title, generation date, platform labels, and selected content pieces."}
          </div>
          <Button className="w-full" onClick={download}>
            <Download className="h-4 w-4" />
            Download {format.toUpperCase()}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
