"use client";

import { Copy, ThumbsUp, ThumbsDown, RotateCcw, Check } from "lucide-react";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface GeneratedContentCardProps {
  content: string;
  platform: string;
}

export function GeneratedContentCard({ content, platform }: GeneratedContentCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="flex flex-col bg-[#090909] border-[#232323] overflow-hidden">
      <div className="flex items-center justify-between border-b border-[#232323] p-4 bg-[#151515]">
        <h3 className="font-medium text-white capitalize">{platform} Output</h3>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-[#8A8A8A] hover:text-white hover:bg-[#232323]">
            <ThumbsUp className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-[#8A8A8A] hover:text-white hover:bg-[#232323]">
            <ThumbsDown className="h-4 w-4" />
          </Button>
          <div className="w-px h-4 bg-[#232323] mx-1"></div>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-[#8A8A8A] hover:text-white hover:bg-[#232323]">
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button 
            onClick={handleCopy}
            variant="outline" 
            size="sm" 
            className="h-8 gap-2 bg-[#090909] border-[#232323] text-white hover:bg-[#232323]"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </div>
      <div className="p-6">
        <div className="prose prose-invert max-w-none text-white whitespace-pre-wrap">
          {content}
        </div>
      </div>
    </Card>
  );
}
