"use client";

import { Clipboard, Download, FileJson, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ExportMenu({
  onCopyAll,
  onExport,
}: {
  onCopyAll?: () => void;
  onExport: (format: "pdf" | "csv" | "json") => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" size="sm" onClick={() => onExport("pdf")}>
        <FileText className="h-3.5 w-3.5" />
        PDF
      </Button>
      <Button variant="secondary" size="sm" onClick={() => onExport("csv")}>
        <Download className="h-3.5 w-3.5" />
        CSV
      </Button>
      <Button variant="secondary" size="sm" onClick={() => onExport("json")}>
        <FileJson className="h-3.5 w-3.5" />
        JSON
      </Button>
      <Button variant="secondary" size="sm" onClick={onCopyAll} disabled={!onCopyAll}>
        <Clipboard className="h-3.5 w-3.5" />
        Copy all
      </Button>
    </div>
  );
}
