"use client";

import { Card } from "@/components/ui/card";

export function LoadingSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Topbar Skeleton */}
      <div className="flex items-center justify-between border-b border-[#232323] bg-[#090909] pb-6">
        <div className="h-8 w-48 rounded-lg bg-[#151515]"></div>
        <div className="h-10 w-32 rounded-lg bg-[#151515]"></div>
      </div>

      {/* Stats Grid Skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-6 bg-[#090909] border-[#232323]">
            <div className="flex items-center justify-between mb-4">
              <div className="h-4 w-24 rounded bg-[#151515]"></div>
              <div className="h-4 w-4 rounded-full bg-[#151515]"></div>
            </div>
            <div className="flex items-baseline gap-2">
              <div className="h-8 w-16 rounded bg-[#151515]"></div>
              <div className="h-4 w-10 rounded bg-[#151515]"></div>
            </div>
          </Card>
        ))}
      </div>

      {/* Main Content Area Skeleton */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 bg-[#090909] border-[#232323] min-h-[300px]">
            <div className="h-6 w-32 rounded bg-[#151515] mb-6"></div>
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 border border-[#232323] rounded-xl bg-[#090909]">
                  <div className="h-10 w-10 rounded-lg bg-[#151515]"></div>
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-1/3 rounded bg-[#151515]"></div>
                    <div className="h-3 w-1/4 rounded bg-[#151515]"></div>
                  </div>
                  <div className="h-8 w-20 rounded bg-[#151515]"></div>
                </div>
              ))}
            </div>
          </Card>
        </div>
        <div className="space-y-6">
          <Card className="p-6 bg-[#090909] border-[#232323] min-h-[300px]">
            <div className="h-6 w-32 rounded bg-[#151515] mb-6"></div>
            <div className="grid grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 rounded-xl bg-[#151515] border border-[#232323]"></div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
