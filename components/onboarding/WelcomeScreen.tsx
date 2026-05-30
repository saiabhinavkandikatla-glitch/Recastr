"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, CalendarClock, FileText, Layers3, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const cards = [
  {
    icon: FileText,
    title: "One source becomes a month of content",
    body: "Paste a podcast, video, blog, or raw notes. Recastr turns the strongest ideas into platform-ready posts.",
  },
  {
    icon: Layers3,
    title: "Hooks first, posts second",
    body: "The workspace extracts high-reach moments before generating LinkedIn, X, Instagram, Threads, and YouTube assets.",
  },
  {
    icon: CalendarClock,
    title: "Schedule, get reminded, post manually",
    body: "Pick a date on any content card. Recastr emails the post when it is time, so no social account tokens are required.",
  },
];

export function WelcomeScreen() {
  const router = useRouter();

  return (
    <div className="mx-auto flex min-h-[calc(100vh-160px)] max-w-5xl flex-col justify-center gap-8 py-10">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.32, 1] }}
        className="rounded-[32px] border border-white/5 bg-card/40 p-8 shadow-2xl glass-card"
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Sparkles className="h-7 w-7" />
        </div>
        <h1 className="mt-6 max-w-3xl font-display text-4xl font-bold tracking-tight sm:text-5xl">
          Welcome to the Recastr content engine.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
          We will set up your workspace in a few quick questions, then take you to the dashboard so the flow feels calm instead of dumping you into a demo project.
        </p>
        <Button
          className="mt-7 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-6 font-bold text-white shadow-glow hover:opacity-90"
          onClick={() => router.push("/onboarding?setup=1")}
        >
          Get started
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </motion.div>

      <motion.div
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
        className="grid gap-4 md:grid-cols-3"
      >
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.title}
              variants={{
                hidden: { opacity: 0, y: 18 },
                show: { opacity: 1, y: 0, transition: { duration: 0.24 } },
              }}
              className="rounded-[24px] border border-white/5 bg-card/35 p-6 glass-panel"
            >
              <Icon className="h-6 w-6 text-primary" />
              <h2 className="mt-4 text-lg font-bold">{card.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{card.body}</p>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
