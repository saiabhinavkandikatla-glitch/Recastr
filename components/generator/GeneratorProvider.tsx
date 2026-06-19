"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { toast } from "sonner";
import { emitCreditExhausted } from "@/lib/client-api";
import type { Platform, Project, SocialOutput } from "@/lib/types";

type GeneratorState = {
  project: Project | null;
  setProject: (p: Project | null) => void;
  selectedPlatforms: Platform[];
  togglePlatform: (p: Platform) => void;
  tone: string;
  setTone: (t: string) => void;
  isGenerating: boolean;
  isAnalyzing: boolean;
  setIsAnalyzing: (b: boolean) => void;
  progress: string;
  generate: () => Promise<void>;
  outputs: SocialOutput[];
  activePreviewTab: Platform;
  setActivePreviewTab: (p: Platform) => void;
};

const GeneratorContext = createContext<GeneratorState | null>(null);

export function GeneratorProvider({ 
  children, 
  project 
}: { 
  children: React.ReactNode; 
  project: Project | null 
}) {
  const [currentProject, setCurrentProject] = useState<Project | null>(project);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(["TWITTER", "LINKEDIN", "INSTAGRAM"]);
  const [tone, setTone] = useState("Professional");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState<string>("idle");
  const [outputs, setOutputs] = useState<SocialOutput[]>([]);
  const [activePreviewTab, setActivePreviewTab] = useState<Platform>("TWITTER");

  // Sync state with prop if it changes
  useEffect(() => {
    setCurrentProject(project);
    if (project) {
      // If project has content, mark as completed to show preview directly
      setProgress(project.contents && project.contents.length > 0 ? "completed" : "idle");
    } else {
      setProgress("idle");
    }
  }, [project]);

  const togglePlatform = (p: Platform) => {
    setSelectedPlatforms((prev) => 
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  const generate = async () => {
    if (!currentProject) {
      toast.error("No project found");
      return;
    }
    if (selectedPlatforms.length === 0) {
      toast.error("Select at least one platform");
      return;
    }
    
    setIsGenerating(true);
    setProgress("extracting");
    setOutputs([]);
    
    const params = new URLSearchParams();
    params.set("projectId", currentProject.id);
    params.set("platforms", selectedPlatforms.join(","));
    params.set("tone", tone);

    try {
      const response = await fetch(`/api/generate?${params.toString()}`);
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        if (response.status === 403 && payload.code === "credit_exhausted") {
          emitCreditExhausted(payload);
        } else {
          toast.error(payload.error ?? "Generation failed");
        }
        setIsGenerating(false);
        setProgress("idle");
        return;
      }

      if (!response.body) throw new Error("No stream");
      setProgress("generating");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        chunk
          .split("\n\n")
          .filter(Boolean)
          .forEach((line) => {
            const payload = line.replace(/^data:\s*/, "");
            try {
              const parsed = JSON.parse(payload);
              if (parsed.done) {
                setProgress("completed");
              } else if (parsed.error) {
                toast.error(parsed.error);
              } else if (parsed.output) {
                setOutputs((prev) => [...prev, parsed.output]);
                // Auto switch tab to first output if it's the first one
                setOutputs((prev) => {
                  if (prev.length === 1) setActivePreviewTab(parsed.output.platform);
                  return prev;
                });
              }
            } catch {
              // ignore parse errors
            }
          });
      }
    } catch {
      toast.error("Network error during generation");
    } finally {
      setIsGenerating(false);
      setProgress("completed");
    }
  };

  return (
    <GeneratorContext.Provider value={{
      project: currentProject,
      setProject: setCurrentProject,
      selectedPlatforms,
      togglePlatform,
      tone,
      setTone,
      isGenerating,
      isAnalyzing,
      setIsAnalyzing,
      progress,
      generate,
      outputs,
      activePreviewTab,
      setActivePreviewTab
    }}>
      {children}
    </GeneratorContext.Provider>
  );
}

export function useGenerator() {
  const context = useContext(GeneratorContext);
  if (!context) throw new Error("useGenerator must be used within GeneratorProvider");
  return context;
}
