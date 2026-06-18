"use client";

import Link from "next/link";
import { FolderOpen, ArrowRight, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const projects = [
  {
    id: "proj_1",
    title: "Q3 Marketing Campaign",
    status: "Draft",
    timeAgo: "2 hours ago",
  },
  {
    id: "proj_2",
    title: "Product Launch Strategy",
    status: "Published",
    timeAgo: "1 day ago",
  },
  {
    id: "proj_3",
    title: "Weekly Engineering Update",
    status: "Generating",
    timeAgo: "3 days ago",
  },
];

export function RecentProjects() {
  return (
    <Card className="flex flex-col bg-[#090909] border-[#232323]">
      <div className="flex items-center justify-between border-b border-[#232323] p-6">
        <div className="flex items-center gap-2">
          <FolderOpen className="h-5 w-5 text-[#8A8A8A]" />
          <h2 className="text-lg font-semibold text-white">Recent Projects</h2>
        </div>
        <Button variant="ghost" className="gap-2 text-[#8A8A8A] hover:text-white" asChild>
          <Link href="/projects">
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
      <div className="flex-1 p-6">
        <div className="space-y-4">
          {projects.map((project) => (
            <div
              key={project.id}
              className="flex items-center justify-between rounded-xl border border-[#232323] p-4 transition-colors hover:bg-[#151515]"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#151515] border border-[#232323]">
                  <FolderOpen className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-medium text-white">{project.title}</h3>
                  <div className="flex items-center gap-2 text-sm text-[#8A8A8A]">
                    <Clock className="h-3 w-3" />
                    <span>{project.timeAgo}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border
                  ${project.status === 'Published' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500' : 
                    project.status === 'Generating' ? 'border-blue-500/20 bg-blue-500/10 text-blue-500' : 
                    'border-[#232323] bg-[#151515] text-[#8A8A8A]'}`}
                >
                  {project.status}
                </span>
                <Button variant="outline" size="sm" className="bg-[#090909] border-[#232323] text-white hover:bg-[#151515]" asChild>
                  <Link href={`/projects/${project.id}`}>Open</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
