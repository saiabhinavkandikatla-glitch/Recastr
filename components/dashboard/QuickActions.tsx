"use client";

import Link from "next/link";
import { Plus, Video, LayoutTemplate, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const actions = [
  {
    title: "New Project",
    description: "Start from scratch",
    icon: Plus,
    href: "/generate",
    primary: true,
  },
  {
    title: "Import Video",
    description: "From YouTube link",
    icon: Video,
    href: "/generate?source=youtube",
  },
  {
    title: "Use Template",
    description: "Pre-built workflows",
    icon: LayoutTemplate,
    href: "/templates",
  },
  {
    title: "Paste Text",
    description: "Quick generation",
    icon: FileText,
    href: "/generate?source=text",
  },
];

export function QuickActions() {
  return (
    <Card className="flex flex-col bg-[#090909] border-[#232323]">
      <div className="border-b border-[#232323] p-6">
        <h2 className="text-lg font-semibold text-white">Quick Actions</h2>
      </div>
      <div className="flex-1 p-6">
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          {actions.map((action, i) => {
            const Icon = action.icon;
            return (
              <Link
                key={i}
                href={action.href}
                className={`group flex items-start gap-4 rounded-xl border p-4 transition-all ${
                  action.primary
                    ? "border-zinc-700 bg-zinc-900/50 hover:bg-zinc-800"
                    : "border-[#232323] bg-[#090909] hover:bg-[#151515]"
                }`}
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                  action.primary ? "bg-white text-black" : "bg-[#151515] border border-[#232323] text-white group-hover:bg-[#232323]"
                }`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-medium text-white">{action.title}</h3>
                  <p className="text-sm text-[#8A8A8A]">{action.description}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
