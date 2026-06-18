"use client";

import { FolderOpen, FileText, Calendar } from "lucide-react";
import Link from "next/link";

interface SearchResult {
  id: string;
  type: "project" | "content" | "schedule";
  title: string;
  subtitle: string;
  href: string;
}

const mockResults: SearchResult[] = [
  {
    id: "1",
    type: "project",
    title: "Q3 Marketing Campaign",
    subtitle: "Created 2 days ago",
    href: "/projects/1",
  },
  {
    id: "2",
    type: "content",
    title: "LinkedIn Post - Product Launch",
    subtitle: "Generated in Q3 Marketing Campaign",
    href: "/projects/1?tab=content",
  },
];

const icons = {
  project: FolderOpen,
  content: FileText,
  schedule: Calendar,
};

export function SearchResults({ query }: { query: string }) {
  if (!query) return null;

  return (
    <div className="absolute top-full mt-2 w-full max-w-md overflow-hidden rounded-xl border border-[#232323] bg-[#090909] shadow-xl z-50">
      <div className="p-2">
        <h3 className="px-3 py-2 text-xs font-semibold text-[#8A8A8A] uppercase tracking-wider">
          Results for "{query}"
        </h3>
        <div className="mt-1 space-y-1">
          {mockResults.map((result) => {
            const Icon = icons[result.type];
            return (
              <Link
                key={result.id}
                href={result.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-[#151515]"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#151515] border border-[#232323]">
                  <Icon className="h-4 w-4 text-[#8A8A8A]" />
                </div>
                <div>
                  <div className="text-sm font-medium text-white">{result.title}</div>
                  <div className="text-xs text-[#8A8A8A]">{result.subtitle}</div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
