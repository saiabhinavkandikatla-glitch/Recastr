"use client";

import { Check, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";

interface Step {
  id: string;
  label: string;
  status: "pending" | "processing" | "completed" | "error";
}

export function GenerationProgress({ steps }: { steps: Step[] }) {
  return (
    <Card className="bg-[#090909] border-[#232323] p-6">
      <h3 className="text-sm font-medium text-white mb-6">Processing Pipeline</h3>
      <div className="space-y-6">
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          
          return (
            <div key={step.id} className="relative flex gap-4">
              {!isLast && (
                <div 
                  className={`absolute left-[11px] top-8 h-full w-px -translate-x-1/2 ${
                    step.status === "completed" ? "bg-emerald-500" : "bg-[#232323]"
                  }`}
                />
              )}
              
              <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#090909]">
                {step.status === "completed" ? (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500">
                    <Check className="h-3.5 w-3.5" />
                  </div>
                ) : step.status === "processing" ? (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/20 text-blue-500">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  </div>
                ) : step.status === "error" ? (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500/20 text-red-500">
                    <span className="text-xs font-bold">!</span>
                  </div>
                ) : (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full border border-[#232323] bg-[#151515]">
                    <span className="text-[10px] font-medium text-[#8A8A8A]">{index + 1}</span>
                  </div>
                )}
              </div>
              
              <div className="flex flex-col pb-6">
                <span className={`text-sm font-medium ${
                  step.status === "completed" ? "text-white" : 
                  step.status === "processing" ? "text-blue-500" : 
                  step.status === "error" ? "text-red-500" : "text-[#8A8A8A]"
                }`}>
                  {step.label}
                </span>
                {step.status === "processing" && (
                  <span className="text-xs text-[#8A8A8A] mt-1">This might take a minute...</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
