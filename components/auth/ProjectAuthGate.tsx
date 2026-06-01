"use client";

import { useState } from "react";
import Link from "next/link";
import { LockKeyhole, Sparkles } from "lucide-react";
import { AuthPromptModal } from "@/components/auth/AuthPromptModal";
import { Button } from "@/components/ui/button";
import type { Project } from "@/lib/types";

export function ProjectAuthGate({ project }: { project: Project }) {
  const [open, setOpen] = useState(true);
  const pieceCount = project.contents?.length ?? project.outputs.length;

  return (
    <section className="mx-auto flex min-h-[calc(100vh-160px)] max-w-3xl items-center justify-center px-4 py-12">
      <div className="w-full rounded-3xl border border-[var(--app-line)] bg-[var(--app-surface)] p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--violet)] text-white">
          <LockKeyhole className="h-6 w-6" />
        </div>
        <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Sign up to continue</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{project.title}</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
          Demo mode lets you preview the product shell. Create a free account to open full projects, edit all {pieceCount} generated pieces, export, and schedule content.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Button className="rounded-full bg-[var(--violet)] text-white hover:bg-[var(--violet-hover)]" onClick={() => setOpen(true)}>
            <Sparkles className="h-4 w-4" />
            Create free account
          </Button>
          <Button asChild className="rounded-full" variant="secondary">
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </div>

      <AuthPromptModal open={open} onOpenChange={setOpen} projectTitle={project.title} />
    </section>
  );
}
