"use client";

import { useState, type ComponentType, useEffect, type SVGProps } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useScroll, useTransform } from "framer-motion";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Copy,
  FileText,
  Play,
  Sparkles,
  Target,
  Timer,
  Wand2,
  X,
  Zap,
  Globe,
  CalendarDays
} from "lucide-react";
import { RazorpayButton } from "@/components/billing/RazorpayButton";
import { PlatformPreviewEngine } from "@/components/preview/PlatformPreview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { copy } from "@/lib/copy";
import { cn } from "@/lib/utils";

const showcaseDraft = `Most creators do not need more ideas.

They need a cleaner way to extract the strongest moments from work they already did.

Turn the source into hooks first. Then translate those hooks into native posts, captions, and community prompts.`;


const faq = [
  ["What does Recastr generate?", "Threads, LinkedIn posts, Instagram captions, YouTube Community posts, and scripts from one long-form source."],
  ["Does it post automatically?", "Scheduling is supported natively, but you can also export and copy to external tools."],
  ["Who is it for?", "Founders, creators, podcasters, YouTubers, and agencies repurposing long-form content."],
  ["Is there a free trial?", "Yes, you get free credits on signup to test the engine with your own source material."],
];

const workflowSteps: Array<{
  icon: ComponentType<{ className?: string }>;
  title: string;
  body: string;
}> = [
  { icon: FileText, title: "Paste source", body: "YouTube, podcast, blog, or text." },
  { icon: Sparkles, title: "Extract hooks", body: "Rank the moments most likely to earn attention." },
  { icon: Wand2, title: "Generate pack", body: "Create posts, captions, scripts, and community prompts." },
  { icon: Copy, title: "Copy/export", body: "Move approved content into your publishing flow." },
];

const featureCards: Array<{
  title: string;
  body: string;
  Icon: ComponentType<{ className?: string }>;
}> = [
  {
    title: "Viral Hook Intelligence",
    body: "Ranks emotional moments, data points, and curiosity gaps.",
    Icon: Zap,
  },
  {
    title: "Native previews",
    body: "Preview content in platform-specific mobile and desktop frames.",
    Icon: Globe,
  },
  {
    title: "Tone rewrites",
    body: "Shift between professional, casual, educational, and entertaining.",
    Icon: Sparkles,
  },
  {
    title: "Export packs",
    body: "Download approved assets as PDF, CSV, or JSON.",
    Icon: Copy,
  },
  {
    title: "Queue and schedule",
    body: "Keep approved posts moving without a complex calendar.",
    Icon: CalendarDays,
  },
  {
    title: "Demo-safe mode",
    body: "Run the pitch flow locally without external credentials.",
    Icon: Shield,
  },
];

export function LandingPage() {
  const [demoOpen, setDemoOpen] = useState(false);
  const { scrollYProgress } = useScroll();
  const heroY = useTransform(scrollYProgress, [0, 0.2], [0, -50]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

  // Prevent body scroll when demo modal is open
  useEffect(() => {
    if (demoOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "auto";
    return () => { document.body.style.overflow = "auto"; };
  }, [demoOpen]);

  return (
    <main className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary/20">
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/5 bg-background/60 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
          <Link href="/" className="flex items-center gap-3 group">
            <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 text-white shadow-glow transition-transform group-hover:scale-105">
              <Sparkles className="h-5 w-5" />
            </span>
            <span className="font-display text-[15px] font-bold tracking-wide">{copy.product.name}</span>
          </Link>
          <div className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
            <a href="#problem" className="hover:text-foreground transition-colors">Problem</a>
            <a href="#workflow" className="hover:text-foreground transition-colors">Workflow</a>
            <a href="#showcase" className="hover:text-foreground transition-colors">Preview</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" className="hidden sm:inline-flex rounded-full px-5 hover:bg-muted">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild className="rounded-full bg-foreground text-background hover:bg-foreground/90 px-6 font-medium shadow-xl">
              <Link href="/onboarding">
                Start free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-28 aurora-bg overflow-hidden">
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay pointer-events-none" />

        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="mx-auto max-w-7xl px-5 lg:px-8 relative z-10"
        >
          <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 px-3 py-1 mb-8 rounded-full text-xs font-semibold tracking-wide uppercase">
                <Wand2 className="mr-2 h-3.5 w-3.5" />
                Viral Hook Intelligence
              </Badge>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
              className="text-5xl font-display font-bold leading-[1.1] tracking-tight sm:text-7xl mb-6 text-foreground"
            >
              One video. <br className="hidden sm:block" />
              <span className="text-gradient">30 days of content.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
              className="max-w-2xl text-lg leading-relaxed text-muted-foreground mb-10"
            >
              Recastr turns podcasts, YouTube videos, and blog posts into platform-ready posts creators can edit, preview, copy, and export.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
              className="flex flex-col gap-4 sm:flex-row w-full sm:w-auto"
            >
              <Button asChild size="lg" className="h-14 rounded-full bg-gradient-to-r from-violet-600 to-cyan-500 text-white hover:opacity-90 px-8 font-semibold shadow-glow text-base w-full sm:w-auto transition-transform hover:scale-105">
                <Link href="/onboarding">
                  Generate your first pack
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" onClick={() => setDemoOpen(true)} className="h-14 rounded-full px-8 font-semibold text-base w-full sm:w-auto bg-background/50 backdrop-blur-md hover:bg-background border-white/10">
                <Play className="mr-2 h-5 w-5" />
                Watch product tour
              </Button>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5, ease: "easeOut" }}
            className="mt-20 relative mx-auto max-w-5xl perspective-1000"
          >
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-b from-primary/20 to-transparent blur-xl opacity-50" />
            <div className="relative rounded-[20px] border border-white/10 bg-card/40 backdrop-blur-md shadow-2xl p-2 transform rotate-x-12 hover:rotate-x-0 transition-transform duration-700 ease-out">
              <ProductScreenshot
                alt="Recastr project workspace screenshot"
                fallbackTitle="Project workspace"
                fallbackCopy="Hooks on the left. Generated content in the feed. Native previews inside every card."
                src="/product-project-preview.png"
              />
            </div>

            {/* Floating stat cards */}
            <motion.div
              className="absolute -left-12 top-20 hidden lg:block"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="glass-card rounded-2xl p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-violet-500/20 flex items-center justify-center">
                  <Timer className="h-5 w-5 text-violet-500" />
                </div>
                <div>
                  <p className="font-bold text-lg">5 min</p>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">To First Draft</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              className="absolute -right-12 bottom-20 hidden lg:block"
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            >
              <div className="glass-card rounded-2xl p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-cyan-500" />
                </div>
                <div>
                  <p className="font-bold text-lg">30+ Assets</p>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Per Source</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* Problem Section */}
      <section id="problem" className="py-24 relative">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-3">
            <SectionIntro
              eyebrow="The problem"
              title="Long-form content dies too quickly."
              body="Creators spend hours recording, then lose the best moments inside a single publish event."
            />
            <div className="lg:col-span-2 grid gap-6 sm:grid-cols-2">
              <InsightCard icon={Timer} title="Too slow" body="Repurposing manually often takes longer than creating the original source material." />
              <InsightCard icon={Target} title="Too generic" body="Most AI outputs look like resized copy instead of platform-native content." />
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-24 bg-muted/30 border-y border-white/5 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-1/2 h-full bg-gradient-to-l from-primary/5 to-transparent pointer-events-none" />
        <div className="mx-auto max-w-7xl px-5 lg:px-8 relative z-10">
          <div className="grid gap-12 lg:grid-cols-[400px_1fr] items-center">
            <SectionIntro
              eyebrow="The solution"
              title="Extract the hook, then generate."
              body="Recastr ranks the strongest moments, turns them into native assets, and lets you preview the final post before exporting."
            />
            <div className="grid gap-6 md:grid-cols-3">
              {[
                ["Analyze", "Paste a URL, audio, blog, or raw transcript."],
                ["Rank hooks", "Find curiosity gaps, data moments, and stories."],
                ["Ship assets", "Generate platform-ready drafts with native previews."],
              ].map((item, index) => {
              const [title, body] = item;
              return (
                <Card key={title} className="glass-card bg-card/40 hover:bg-card/60 transition-colors border-white/5 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <CardContent className="p-6 relative z-10">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 font-mono text-sm font-bold text-primary mb-4">
                      {index + 1}
                    </span>
                    <h3 className="text-xl font-bold">{title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
                  </CardContent>
                </Card>
              );
            })}
            </div>
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section id="workflow" className="py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8 text-center max-w-3xl">
          <SectionIntro
            eyebrow="How it works"
            title="A focused creator workflow."
            body="No heavy dashboard maze. One source becomes hooks, cards, previews, and exports in a straight line."
            centered
          />
          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 relative">
            {/* Connecting line */}
            <div className="hidden lg:block absolute top-12 left-1/8 right-1/8 h-[2px] bg-gradient-to-r from-transparent via-primary/30 to-transparent z-0" />

            {workflowSteps.map((step) => {
              const { body, icon: Icon, title } = step;
              return (
              <div key={title} className="relative z-10 flex flex-col items-center group">
                <div className="flex h-24 w-24 items-center justify-center rounded-full glass-card bg-card/80 border-primary/20 shadow-glow mb-6 transition-transform group-hover:scale-110">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 text-white">
                    <Icon className="h-7 w-7" />
                  </div>
                </div>
                <h3 className="text-lg font-bold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground max-w-[200px]">{body}</p>
              </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Preview Showcase */}
      <section id="showcase" className="py-24 bg-card/30 border-y border-white/5 overflow-hidden">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[400px_1fr] items-center">
            <SectionIntro
              eyebrow="Platform preview showcase"
              title="See the content before it goes live."
              body="Switch between LinkedIn, X, Instagram, Threads, and YouTube Community. Mobile and desktop frames are pixel-perfect."
            />
            <div className="relative rounded-[24px] border border-white/10 bg-background/50 p-4 shadow-2xl glass-panel">
              <PlatformPreviewEngine draft={showcaseDraft} platform="LINKEDIN" />
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <SectionIntro
              eyebrow="Feature grid"
              title="Everything needed to repurpose without clutter."
              body="The core loop stays simple. Secondary scheduling and tasks stay available without taking over the product."
              centered
            />
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featureCards.map(({ Icon, body, title }) => (
              <Card key={title} className="glass-card bg-card/30 hover:bg-card/60 transition-all duration-300 hover:-translate-y-1 group">
                <CardContent className="p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-6 transition-colors group-hover:bg-primary group-hover:text-white">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 bg-muted/20 border-y border-white/5">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <SectionIntro
              eyebrow="Pricing"
              title="Simple plans for creators."
              body="Start free, upgrade when repurposing becomes part of your weekly operating rhythm."
              centered
            />
          </div>
          <div className="grid gap-8 lg:grid-cols-3 items-center">
            {[
              ["Free", "0", "3 projects/month", null],
              ["Pro", "29", "Unlimited projects + scheduling", "PRO"],
              ["Team", "79", "Collaboration and client workflows", "TEAM"],
            ].map((item) => {
              const [name, price, body, plan] = item;
              return (
              <Card
                key={name}
                className={cn(
                  "glass-card bg-card/80 transition-all duration-300",
                  name === "Pro" ? "border-primary/50 shadow-glow scale-105 z-10" : "hover:border-white/20"
                )}
              >
                <CardContent className="p-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-2xl font-bold font-display">{name}</h3>
                    {name === "Pro" && <Badge className="bg-gradient-to-r from-violet-500 to-cyan-500 text-white border-0">Popular</Badge>}
                  </div>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-4xl font-bold">${price}</span>
                    <span className="text-muted-foreground font-medium">/month</span>
                  </div>
                  <p className="text-sm font-medium text-muted-foreground mb-8 pb-8 border-b border-white/10">{body}</p>

                  <div className="space-y-4 mb-8">
                    {[
                      "Hook intelligence",
                      "Native previews",
                      "Copy and export tools",
                      ...(name !== "Free" ? ["Priority scheduling"] : []),
                    ].map((feature) => (
                      <div key={feature} className="flex items-center gap-3 text-sm font-medium">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-primary">
                          <Check className="h-3 w-3" />
                        </div>
                        {feature}
                      </div>
                    ))}
                  </div>

                  {plan ? (
                    <RazorpayButton className="w-full h-12 rounded-xl text-base" interval="monthly" label={`Choose ${name}`} plan={plan as "PRO" | "TEAM"} />
                  ) : (
                    <Button asChild className="w-full h-12 rounded-xl text-base bg-foreground text-background hover:bg-foreground/90">
                      <Link href="/onboarding">Start free</Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ & CTA */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />

        <div className="mx-auto max-w-3xl px-5 lg:px-8 relative z-10 mb-32">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold font-display">Questions before you generate.</h2>
          </div>
          <div className="divide-y divide-white/5 rounded-[20px] border border-white/10 bg-card/60 backdrop-blur-xl">
            {faq.map((item) => {
              const [question, answer] = item;
              return (
              <details key={question} className="group p-6">
                <summary className="flex cursor-pointer list-none items-center justify-between text-lg font-semibold">
                  {question}
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted/50 transition-transform group-open:rotate-180">
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </summary>
                <p className="mt-4 text-base leading-relaxed text-muted-foreground pr-8">{answer}</p>
              </details>
              );
            })}
          </div>
        </div>

        <div className="mx-auto max-w-4xl px-5 text-center lg:px-8 relative z-10">
          <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 px-3 py-1 mb-6 rounded-full text-xs font-semibold tracking-wide uppercase">
            Get Started Today
          </Badge>
          <h2 className="text-5xl font-bold font-display tracking-tight mb-6">Turn your next source into a <span className="text-gradient">content system.</span></h2>
          <p className="mx-auto max-w-2xl text-xl leading-relaxed text-muted-foreground mb-10">
            Start generating platform-native posts from your existing long-form content in minutes.
          </p>
          <Button asChild size="lg" className="h-16 rounded-full bg-gradient-to-r from-violet-600 to-cyan-500 text-white hover:opacity-90 px-10 font-bold shadow-glow text-lg transition-transform hover:scale-105">
            <Link href="/onboarding">
              Start generating now
              <ArrowRight className="ml-2 h-6 w-6" />
            </Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-white/5 bg-background py-12 text-sm text-muted-foreground">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 lg:px-8 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="font-semibold">{copy.product.name}</span>
            <span className="mx-2">•</span>
            <span>AI content command center.</span>
          </div>
          <div className="flex gap-6 font-medium">
            <Link href="/login" className="hover:text-foreground transition-colors">Login</Link>
            <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
            <Link href="/settings" className="hover:text-foreground transition-colors">Billing</Link>
          </div>
        </div>
      </footer>

      <AnimatePresence>
        {demoOpen && (
          <motion.div
            className="fixed inset-0 z-[100] grid place-items-center bg-background/90 backdrop-blur-sm p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-4xl overflow-hidden rounded-[24px] border border-white/10 bg-card shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/5 p-4 bg-background/50">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-500/80" />
                  <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                  <div className="h-3 w-3 rounded-full bg-green-500/80" />
                  <p className="text-sm font-medium ml-2">Product Tour</p>
                </div>
                <Button aria-label="Close demo" size="icon" variant="ghost" className="h-8 w-8 rounded-full" onClick={() => setDemoOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="aspect-video bg-black relative">
                {/* Fallback for when no actual video exists */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 bg-gradient-to-br from-slate-900 to-black">
                  <div className="h-20 w-20 rounded-full bg-primary/20 flex items-center justify-center mb-6 border border-primary/30 shadow-glow">
                    <Play className="h-8 w-8 text-primary ml-1" />
                  </div>
                  <h3 className="text-2xl font-bold font-display text-white mb-2">Product tour video</h3>
                  <p className="text-muted-foreground max-w-md">See how to turn a 40-minute podcast into 30 days of social content in 5 minutes.</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

function SectionIntro({
  eyebrow,
  title,
  body,
  centered = false,
}: {
  eyebrow: string;
  title: string;
  body: string;
  centered?: boolean;
}) {
  return (
    <div className={cn(centered && "text-center")}>
      <Badge className={cn(
        "bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 px-3 py-1 mb-4 rounded-full text-xs font-semibold tracking-wide uppercase",
        centered && "mx-auto"
      )}>
        {eyebrow}
      </Badge>
      <h2 className="text-3xl font-display font-bold tracking-tight sm:text-4xl">{title}</h2>
      <p className={cn(
        "mt-4 text-lg leading-relaxed text-muted-foreground",
        centered && "mx-auto max-w-2xl"
      )}>{body}</p>
    </div>
  );
}

function InsightCard({
  icon: Icon,
  title,
  body,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <Card className="glass-card bg-card/50 border-white/5">
      <CardContent className="p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4">
          <Icon className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-bold">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
      </CardContent>
    </Card>
  );
}

function ProductScreenshot({
  alt,
  fallbackCopy,
  fallbackTitle,
  src,
}: {
  alt: string;
  fallbackCopy: string;
  fallbackTitle: string;
  src: string;
}) {
  return (
    <div className="overflow-hidden rounded-xl bg-card">
      <span className="sr-only">
        {fallbackTitle}. {fallbackCopy}
      </span>
      <Image
        alt={alt}
        src={src}
        width={1200}
        height={760}
        className="h-auto w-full object-cover"
        priority
      />
    </div>
  );
}

// Additional icon components needed
function Shield(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
    </svg>
  );
}
