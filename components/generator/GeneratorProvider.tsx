"use client";

import React, { createContext, useContext, useState, useEffect, Component, ReactNode } from "react";
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

class GeneratorErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    console.error('[ERROR BOUNDARY] Caught render error:', error);
    console.error('[ERROR BOUNDARY] Stack:', error.stack);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ERROR BOUNDARY] componentDidCatch:', error);
    console.error('[ERROR BOUNDARY] componentStack:', errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return <div className="p-4 text-red-500">Generator Error: {this.state.error?.message}</div>;
    }
    return this.props.children;
  }
}

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

  useEffect(() => {
    console.log('[DEBUG] GeneratorProvider - isAnalyzing changed:', isAnalyzing);
  }, [isAnalyzing]);
  const [outputs, setOutputs] = useState<SocialOutput[]>([]);
  const [activePreviewTab, setActivePreviewTab] = useState<Platform>("TWITTER");

  // Sync state with prop if it changes
  useEffect(() => {
    setCurrentProject(project);
    if (project) {
      if (project.outputs && project.outputs.length > 0) {
        setOutputs(project.outputs);
        setActivePreviewTab(project.outputs[0].platform);
        setProgress("completed");
      } else {
        setOutputs([]);
        setProgress("idle");
      }
    } else {
      setOutputs([]);
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
      <GeneratorErrorBoundary>
        {children}
      </GeneratorErrorBoundary>
    </GeneratorContext.Provider>
  );
}

export function useGenerator() {
  const context = useContext(GeneratorContext);
  if (!context) throw new Error("useGenerator must be used within GeneratorProvider");
  return context;
}
