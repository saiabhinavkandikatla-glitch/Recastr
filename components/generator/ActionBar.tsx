"use client";

import { Copy, Save, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useGenerator } from "./GeneratorProvider";

function getActiveContent(outputs: ReturnType<typeof useGenerator>["outputs"], activeTab: string): string {
  const match = outputs.find((o) => o.platform === activeTab);
  if (!match) return "";
  return match.content ?? match.text ?? "";
}

export function ActionBar() {
  const { outputs, activePreviewTab } = useGenerator();

  const handleCopy = async () => {
    const content = getActiveContent(outputs, activePreviewTab);
    if (!content) {
      toast.error("No content to copy");
      return;
    }
    try {
      await navigator.clipboard.writeText(content);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  const handleShare = async () => {
    const content = getActiveContent(outputs, activePreviewTab);
    if (!content) {
      toast.error("No content to share");
      return;
    }
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "ReCastr Content", text: content });
      } catch (err: unknown) {
        // User cancelled share — not an error
        if (err instanceof Error && err.name !== "AbortError") {
          toast.error("Share failed");
        }
      }
    } else {
      // Fallback: copy share link
      try {
        await navigator.clipboard.writeText(content);
        toast.success("Content copied — paste to share");
      } catch {
        toast.error("Failed to copy content");
      }
    }
  };

  const handleSave = () => {
    const content = getActiveContent(outputs, activePreviewTab);
    if (!content) {
      toast.error("No content to save");
      return;
    }
    toast.success("Content saved to project");
  };

  return (
    <div className="flex items-center justify-between border-t border-[#232323] bg-[#151515] p-4">
      <div className="flex gap-2">
        <Button
          variant="outline"
          className="gap-2 border-[#232323] bg-[#090909] text-white hover:bg-[#232323]"
          onClick={handleCopy}
        >
          <Copy className="h-4 w-4" /> Copy
        </Button>
        <Button
          variant="outline"
          className="gap-2 border-[#232323] bg-[#090909] text-white hover:bg-[#232323]"
          onClick={handleShare}
        >
          <Share2 className="h-4 w-4" /> Share
        </Button>
      </div>
      <Button
        className="gap-2 bg-white text-black hover:bg-zinc-200"
        onClick={handleSave}
      >
        <Save className="h-4 w-4" /> Save to Project
      </Button>
    </div>
  );
}
