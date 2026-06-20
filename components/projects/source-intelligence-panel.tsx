"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Lightbulb, PencilLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { SourceSummary } from "@/lib/types";

export function SourceIntelligencePanel({ summary }: { summary: SourceSummary }) {
  const [open, setOpen] = useState(false);
  const [editableSummary, setEditableSummary] = useState(summary.tldr);

  return (
    <Card className="overflow-hidden shadow-none">
      <CardHeader className="border-b bg-muted/30">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex w-full items-center justify-between text-left"
        >
          <div>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-primary" />
              Source intelligence
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Editable context used before generating platform outputs.
            </p>
          </div>
          <ChevronDown
            className={cn("h-4 w-4 transition", open && "rotate-180")}
          />
        </button>
      </CardHeader>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="overflow-hidden"
          >
        <CardContent className="grid max-h-[420px] gap-5 overflow-y-auto lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">3-sentence TL;DR</h3>
              <Button variant="ghost" size="sm">
                <PencilLine className="h-3.5 w-3.5" />
                Edit
              </Button>
            </div>
            <Textarea
              className="min-h-32 text-sm"
              value={editableSummary}
              onChange={(event) => setEditableSummary(event.target.value)}
            />
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Identified tone
              </p>
              <p className="mt-1 rounded-[8px] border bg-muted/50 px-3 py-2 text-sm capitalize">
                {summary.detectedTone}
              </p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
            <div>
              <h3 className="text-sm font-medium">5 key takeaways</h3>
              <ul className="mt-3 space-y-2">
                {summary.takeaways.map((takeaway) => (
                  <li key={takeaway} className="flex gap-2 text-sm text-muted-foreground">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    {takeaway}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-medium">Content Assets</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {summary.hooks.map((hook) => (
                  <span
                    key={hook}
                    className="rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground"
                  >
                    {hook}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </Card>
  );
}
