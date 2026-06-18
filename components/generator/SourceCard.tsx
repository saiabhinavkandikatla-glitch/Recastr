"use client";

import { FileText, Video, PlayCircle } from "lucide-react";
import { useGenerator } from "./GeneratorProvider";

export function SourceCard() {
  const { project } = useGenerator();

  return (
    <div className="rounded-[32px] border border-[#232323] bg-[#151515] p-5">
      <h3 className="text-base font-semibold text-white mb-3">Source Content</h3>
      
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
                <span className="capitalize text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">{project.sourceType.toLowerCase()}</span>
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
            <button className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#232323] py-2 text-xs font-medium text-white transition-colors">
              <Video className="h-3.5 w-3.5 text-red-500" /> URL
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#090909] border border-[#232323] py-2 text-xs font-medium text-[#8A8A8A] hover:text-white transition-colors">
              <FileText className="h-3.5 w-3.5" /> Text
            </button>
          </div>
          <div className="space-y-2">
            <input
              placeholder="Paste YouTube or Article URL..."
              className="w-full rounded-xl border border-[#232323] bg-[#090909] px-3 py-2.5 text-sm text-white placeholder:text-[#8A8A8A] focus:border-[#8A8A8A] focus:outline-none"
            />
          </div>
        </>
      )}
    </div>
  );
}
