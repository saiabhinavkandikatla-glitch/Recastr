"use client";

import { Link as LinkIcon, FileText, Youtube } from "lucide-react";

export function SourceCard() {
  return (
    <div className="rounded-[32px] border border-[#232323] bg-[#151515] p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Source Input</h3>
      <div className="flex gap-2 mb-4">
        <button className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#232323] py-2 text-sm font-medium text-white transition-colors">
          <Youtube className="h-4 w-4 text-red-500" /> URL
        </button>
        <button className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#090909] border border-[#232323] py-2 text-sm font-medium text-[#8A8A8A] hover:text-white transition-colors">
          <FileText className="h-4 w-4" /> Text
        </button>
      </div>
      <div className="space-y-2">
        <input
          placeholder="Paste YouTube or Article URL..."
          className="w-full rounded-xl border border-[#232323] bg-[#090909] px-4 py-3 text-sm text-white placeholder:text-[#8A8A8A] focus:border-[#8A8A8A] focus:outline-none"
        />
      </div>
    </div>
  );
}
