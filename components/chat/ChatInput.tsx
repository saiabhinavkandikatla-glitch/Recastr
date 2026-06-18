"use client";

import { Send, Paperclip } from "lucide-react";

export function ChatInput() {
  return (
    <div className="relative flex items-center">
      <button className="absolute left-3 p-2 text-[#8A8A8A] hover:text-white transition-colors">
        <Paperclip className="h-5 w-5" />
      </button>
      <textarea
        rows={1}
        placeholder="Message ReCastr AI..."
        className="w-full resize-none rounded-2xl border border-[#232323] bg-[#111111] py-3 pl-12 pr-12 text-sm text-white placeholder:text-[#8A8A8A] focus:border-[#8A8A8A] focus:outline-none"
        style={{ minHeight: "48px", maxHeight: "200px" }}
      />
      <button className="absolute right-3 p-2 text-blue-500 hover:text-blue-400 transition-colors">
        <Send className="h-5 w-5" />
      </button>
    </div>
  );
}
