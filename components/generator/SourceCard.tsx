"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FileText, Video, PlayCircle, Loader2, History } from "lucide-react";
import { toast } from "sonner";
import { readApiJson } from "@/lib/client-api";
import { useGenerator } from "./GeneratorProvider";
import type { Project } from "@/lib/types";

export function SourceCard({ initialHistory = [] }: { initialHistory?: Project[] }) {
  const { project, setProject, isAnalyzing: isIngesting, setIsAnalyzing: setIsIngesting } = useGenerator();
  const router = useRouter();
  const [mode, setMode] = useState<"url" | "text">("url");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [history, setHistory] = useState<Project[]>(initialHistory);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [hasLoadedInitially, setHasLoadedInitially] = useState(initialHistory.length > 0);
  const [lastError, setLastError] = useState("");

  useEffect(() => {
    if (initialHistory.length > 0) {
      setHistory(initialHistory);
    }
  }, [initialHistory]);

  useEffect(() => {
    if (!project) {
      if (!hasLoadedInitially) {
        loadHistory();
      } else {
        setHasLoadedInitially(false);
      }
    }
  }, [project]);

  async function loadHistory() {
    setIsLoadingHistory(true);
    try {
      const response = await fetch("/api/projects");
      if (response.ok) {
        const data = await response.json();
        setHistory(data.slice(0, 3));
      }
    } catch (error) {
      console.error("Failed to load history:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  }

  async function handleIngest(e?: React.FormEvent) {
    if (e) e.preventDefault();
    
    if (mode === "url") {
      if (!url.trim()) return;
      setIsIngesting(true);
      setLastError("");
      try {
        const response = await fetch("/api/ingest/url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: url.trim() }),
        });
        
        const data = await readApiJson<{ project?: Project; error?: string }>(response);
        if ("project" in data && data.project) {
          toast.success("Source ingested successfully!");
          setProject(data.project);
        } else if ("error" in data && data.error) {
          toast.error(data.error);
        } else {
          toast.error("Failed to ingest source");
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to analyze source";
        setLastError(message);
        toast.error(message);
      } finally {
        setIsIngesting(false);
      }
    } else {
      if (!text.trim()) return;
      setIsIngesting(true);
      setLastError("");
      try {
        const response = await fetch("/api/ingest/text", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            title: title.trim() || undefined,
            text: text.trim() 
          }),
        });
        
        const data = await readApiJson<{ project?: Project; error?: string }>(response);
        if ("project" in data && data.project) {
          toast.success("Text ingested successfully!");
          setProject(data.project);
        } else if ("error" in data && data.error) {
          toast.error(data.error);
        } else {
          toast.error("Failed to ingest text");
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to analyze text";
        setLastError(message);
        toast.error(message);
      } finally {
        setIsIngesting(false);
      }
    }
  }

  return (
    <div className="rounded-[32px] border border-[#232323] bg-[#151515] p-5 transition-all duration-300 hover:border-white/30 hover:shadow-[0_8px_30px_rgba(255,255,255,0.04)]">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold text-white">Source Content</h3>
        {project && (
          <button
            onClick={() => setProject(null)}
            className="text-xs text-[#8A8A8A] hover:text-white transition-colors"
          >
            Reset
          </button>
        )}
      </div>
      
      {project ? (
        <div className="flex flex-col gap-3 rounded-xl border border-[#232323] bg-[#090909] p-4">
          <div className="flex items-start gap-4">
            {project.thumbnailUrl ? (
              <img src={project.thumbnailUrl} alt={project.title} className="h-16 w-16 object-cover rounded-lg border border-[#232323]" />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-500 border border-red-500/20">
                <PlayCircle className="h-8 w-8" />
              </div>
            )}
            
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-sm font-semibold text-white line-clamp-2 leading-snug">{project.title}</span>
              <div className="flex items-center gap-3 mt-2 text-xs text-[#8A8A8A]">
                {project.duration && <span>{Math.round(project.duration / 60)} min</span>}
                {project.wordCount && <span>{project.wordCount.toLocaleString()} words</span>}
                <span className="capitalize text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">
                  {(project?.sourceType || "").toLowerCase()}
                </span>
              </div>
            </div>
          </div>
          
          <div className="text-xs text-[#D1D1D1] bg-[#151515] p-3 rounded-lg border border-[#232323]">
            <span className="font-semibold text-white mb-1 block">Analysis:</span>
            {project.summary?.tldr || "Source transcript loaded and ready for extraction."}
          </div>
          
          {project.summary?.topics && project.summary.topics.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {project.summary.topics.map(topic => (
                <span key={topic} className="text-[10px] text-[#8A8A8A] bg-[#1A1A1A] border border-[#232323] px-2 py-1 rounded-md">
                  #{topic}
                </span>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="flex gap-2 mb-3">
            <button
              type="button"
              onClick={() => setMode("url")}
              className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-medium transition-colors ${
                mode === "url"
                  ? "bg-[#232323] text-white"
                  : "bg-[#090909] border border-[#232323] text-[#8A8A8A] hover:text-white"
              }`}
            >
              <Video className="h-3.5 w-3.5 text-red-500" /> URL
            </button>
            <button
              type="button"
              onClick={() => setMode("text")}
              className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-medium transition-colors ${
                mode === "text"
                  ? "bg-[#232323] text-white"
                  : "bg-[#090909] border border-[#232323] text-[#8A8A8A] hover:text-white"
              }`}
            >
              <FileText className="h-3.5 w-3.5" /> Text
            </button>
          </div>
          <form onSubmit={handleIngest} className="flex flex-col gap-3">
            {mode === "url" ? (
              <input
                placeholder="Paste YouTube or Article URL..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isIngesting}
                className="w-full rounded-xl border border-[#232323] bg-[#090909] px-3 py-2.5 text-sm text-white placeholder:text-[#8A8A8A] focus:border-[#8A8A8A] focus:outline-none disabled:opacity-50"
              />
            ) : (
              <>
                <input
                  placeholder="Enter title (optional)..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={isIngesting}
                  className="w-full rounded-xl border border-[#232323] bg-[#090909] px-3 py-2.5 text-sm text-white placeholder:text-[#8A8A8A] focus:border-[#8A8A8A] focus:outline-none disabled:opacity-50"
                />
                <textarea
                  placeholder="Paste or type your text content..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  disabled={isIngesting}
                  rows={4}
                  className="w-full rounded-xl border border-[#232323] bg-[#090909] px-3 py-2.5 text-sm text-white placeholder:text-[#8A8A8A] focus:border-[#8A8A8A] focus:outline-none disabled:opacity-50 resize-none"
                />
              </>
            )}
            <button 
              type="submit"
              disabled={isIngesting || (mode === "url" ? !url.trim() : !text.trim())}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-white hover:bg-[#E5E5E5] py-2.5 text-sm font-semibold text-black transition-colors disabled:opacity-50"
            >
              {isIngesting ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing...</> : "Analyze Source"}
            </button>
          </form>

          {lastError ? (
            <div className="mt-3 rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-xs text-red-100">
              <p className="font-semibold text-red-200">Analyze Source failed</p>
              <p className="mt-1 text-red-100/80">{lastError}</p>
              {mode === "url" ? (
                <button
                  type="button"
                  onClick={() => {
                    setMode("text");
                    setLastError("");
                  }}
                  className="mt-3 rounded-lg border border-red-300/30 px-3 py-1.5 font-semibold text-red-50 transition-colors hover:bg-red-500/20"
                >
                  Paste transcript instead
                </button>
              ) : null}
            </div>
          ) : null}

          {history.length > 0 && (
            <div className="mt-6 border-t border-[#232323] pt-4">
              <h4 className="text-xs font-semibold text-[#8A8A8A] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <History className="h-3.5 w-3.5" /> Recent Analysis
              </h4>
              <div className="flex flex-col gap-2">
                {history.slice(0, 3).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setProject(item);
                      toast.success(`Loaded "${item.title}"`);
                    }}
                    className="flex flex-col text-left py-3 px-6 rounded-full border border-[#232323] bg-[#090909] hover:border-white/30 hover:bg-[#151515] transition-all group"
                  >
                    <span className="text-xs font-medium text-white truncate w-full group-hover:text-blue-400 transition-colors">
                      {item.title}
                    </span>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-[#8A8A8A]">
                        <span className="capitalize">
                          {(item?.sourceType || "").toLowerCase()}
                        </span>
                        <span>-</span>
                        <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                      </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
