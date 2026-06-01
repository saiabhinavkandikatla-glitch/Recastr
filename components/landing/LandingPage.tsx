"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Sparkles,
  Zap,
  FileText,
  Edit3,
  Send,
} from "lucide-react";

/* ─────────────────────── DATA ─────────────────────── */

const navLinks = [
  { label: "Workflow", href: "#workflow" },
  { label: "Outputs", href: "#outputs" },
  { label: "Pricing", href: "#pricing" },
] as const;

const workflow = [
  {
    step: "01",
    title: "Drop a source",
    body: "Paste a YouTube link, upload a podcast, or import a blog. We transcribe, chunk, and tag in seconds.",
    icon: FileText,
  },
  {
    step: "02",
    title: "Mine viral hooks",
    body: "Hook Intelligence scores every moment for retention, surprise, and shareability.",
    icon: Zap,
  },
  {
    step: "03",
    title: "Generate a month",
    body: "30 days of tweets, threads, LinkedIn, Reel scripts, and captions — written in your voice.",
    icon: Edit3,
  },
  {
    step: "04",
    title: "Edit, approve, ship",
    body: "Inline editor with counters, tone rewrites, diff view, and one-click export.",
    icon: Send,
  },
] as const;

const outputPlatforms = [
  {
    name: "Twitter / X Thread",
    badge: "9/10 VIRAL SCORE",
    quote: "Most founders chase reach. The ones who win chase resonance.",
    details: "6 follow-up tweets generated • 2 alt hooks • 1 CTA variation",
  },
  {
    name: "Reel Script",
    badge: "HOOK IN 1.2s",
    quote: "Hook in 1.2s. Payoff at 0:18. Loop at 0:27.",
    details: "Includes 1s b-roll cue, on-screen text, and caption.",
  },
  {
    name: "LinkedIn",
    badge: "PATTERN BREAK",
    quote: "Pattern-broken openers that don't sound like LinkedIn.",
    details: "Personal anecdote frame • Contrarian opener • Stat hook + reframe",
  },
  {
    name: "Instagram Caption",
    badge: "3 TONES",
    quote: "Warm. Playful. Direct. Switch tone with one click.",
    details: "Tone variations: Warm, Punchy, Authoritative, Curious",
  },
] as const;


const plans = [
  {
    name: "Spark",
    price: "$0",
    period: "by the demo flow",
    description: "Test drive with sample projects.",
    features: [
      "3 demo projects",
      "All output formats",
      "Watermarked exports",
    ],
    cta: "Start free",
    featured: false,
  },
  {
    name: "Creator",
    price: "$24",
    period: "/month — billed monthly",
    description: "For creators publishing every week.",
    features: [
      "8 sources per month",
      "Tone rewrites",
      "PDF, CSV, JSON exports",
      "Notion queue",
    ],
    cta: "Go Creator",
    featured: true,
  },
  {
    name: "Studio",
    price: "$79",
    period: "/month — for teams",
    description: "For agencies and team workflows.",
    features: [
      "Unlimited sources",
      "Brand voice training",
      "Team approvals",
      "API access",
    ],
    cta: "Talk to us",
    featured: false,
  },
] as const;

const faqs = [
  {
    q: "Does Recastr auto-post to social platforms?",
    a: "No. Recastr schedules email reminders with the full post text so you can review, copy, and publish manually without connecting social account tokens.",
  },
  {
    q: "What sources can I use?",
    a: "YouTube links, podcast audio, blog URLs, or pasted text. We handle transcription and analysis automatically.",
  },
  {
    q: "Can I preview platform formats?",
    a: "Yes. Every draft includes a pixel-perfect preview for its target platform — mobile and desktop.",
  },
  {
    q: "Is there a free plan?",
    a: "Yes. Start free with 3 demo projects and upgrade when Recastr becomes part of your weekly publishing flow.",
  },
] as const;

const featuredIn = [
  "Product Hunt",
  "The Hustle",
  "Indie Hackers",
  "Morning Brew",
  "Lenny's Newsletter",
] as const;

const footerLinks = {
  Product: ["Workflow", "Outputs", "Pricing", "Changelog"],
  Company: ["About", "Manifesto", "Careers", "Press"],
  Resources: ["Hook Library", "Docs", "Support", "Status"],
} as const;

const footerHref: Record<string, string> = {
  Workflow: "#workflow",
  Outputs: "#outputs",
  Pricing: "#pricing",
  Changelog: "/login",
  About: "/login",
  Manifesto: "/login",
  Careers: "mailto:hello@recastr.app",
  Press: "mailto:hello@recastr.app",
  "Hook Library": "/login",
  Docs: "/login",
  Support: "mailto:hello@recastr.app",
  Status: "/login",
};

/* ─────────── ANIMATED COUNTER ─────────── */
function AnimatedCounter({
  target,
  suffix = "",
  duration = 2000,
}: {
  target: number;
  suffix?: string;
  duration?: number;
}) {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          const startTime = performance.now();
          const animate = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * target));
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration, hasAnimated]);

  return (
    <span ref={ref}>
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

/* ─────────── FAQ ITEM ─────────── */
function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[var(--landing-line)]">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-4 py-6 text-left"
      >
        <span className="text-base font-medium sm:text-lg">{question}</span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-[var(--landing-muted)] transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <div
        className={`grid transition-all duration-300 ${open ? "grid-rows-[1fr] pb-6 opacity-100" : "grid-rows-[0fr] opacity-0"}`}
      >
        <div className="overflow-hidden">
          <p className="max-w-2xl text-sm leading-relaxed text-[var(--landing-muted)]">
            {answer}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN LANDING PAGE
   ═══════════════════════════════════════════════════════ */
export function LandingPage() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <main className="min-h-screen bg-[var(--landing-bg)] text-[var(--landing-fg)] selection:bg-violet-500/25">
      {/* ─────── NAVIGATION ─────── */}
      <header className="sticky top-0 z-50 border-b border-[var(--landing-line)] bg-[var(--landing-bg)]/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-5 sm:px-6">
          <div className="flex items-center gap-8">
            <Link
              href="/"
              className="flex items-center gap-2.5"
              aria-label="Recastr home"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--landing-accent)]">
                <Sparkles className="h-4 w-4 text-white" />
              </span>
              <span className="font-display text-[15px] font-semibold tracking-tight">
                Recastr
              </span>
            </Link>

            <nav className="hidden items-center gap-1 md:flex">
              {navLinks.map(({ label, href }) => (
                <a
                  key={label}
                  href={href}
                  className="rounded-md px-3 py-1.5 text-[13px] font-medium text-[var(--landing-muted)] transition-colors hover:text-[var(--landing-fg)]"
                >
                  {label}
                </a>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden text-[13px] font-medium text-[var(--landing-muted)] transition-colors hover:text-[var(--landing-fg)] sm:inline"
            >
              Sign in
            </Link>
            <a
              href="#cta"
              className="inline-flex h-9 items-center rounded-full bg-[var(--landing-fg)] px-4 text-[13px] font-semibold text-[var(--landing-bg)] transition-all hover:opacity-90"
            >
              Start free
            </a>

            {/* Mobile menu button */}
            <button
              className="ml-1 flex h-9 w-9 items-center justify-center rounded-md md:hidden"
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              aria-label="Toggle menu"
            >
              <div className="space-y-1.5">
                <span
                  className={`block h-px w-5 bg-[var(--landing-fg)] transition-transform duration-200 ${mobileNavOpen ? "translate-y-[3.5px] rotate-45" : ""}`}
                />
                <span
                  className={`block h-px w-5 bg-[var(--landing-fg)] transition-transform duration-200 ${mobileNavOpen ? "-translate-y-[3.5px] -rotate-45" : ""}`}
                />
              </div>
            </button>
          </div>
        </div>

        {/* Mobile nav dropdown */}
        {mobileNavOpen && (
          <div className="border-t border-[var(--landing-line)] px-5 pb-4 pt-2 md:hidden">
            {navLinks.map(({ label, href }) => (
              <a
                key={label}
                href={href}
                onClick={() => setMobileNavOpen(false)}
                className="block py-2.5 text-sm font-medium text-[var(--landing-muted)] transition-colors hover:text-[var(--landing-fg)]"
              >
                {label}
              </a>
            ))}
            <Link
              href="/login"
              onClick={() => setMobileNavOpen(false)}
              className="block py-2.5 text-sm font-medium text-[var(--landing-muted)]"
            >
              Sign in
            </Link>
          </div>
        )}
      </header>

      {/* ─────── HERO ─────── */}
      <section className="relative overflow-hidden">
        {/* Subtle ambient glow */}
        <div className="pointer-events-none absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-violet-600/[0.07] blur-[120px]" />

        <div className="relative mx-auto max-w-[1200px] px-5 pb-20 pt-20 sm:px-6 sm:pb-28 sm:pt-28">
          {/* Badge */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[var(--landing-line)] bg-[var(--landing-panel)] px-4 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-medium text-[var(--landing-muted)]">
              New
            </span>
            <span className="text-xs font-medium text-[var(--landing-fg)]">
              Viral Hook Intelligence v2
            </span>
          </div>

          {/* Headline */}
          <h1 className="max-w-[820px] font-display text-[clamp(2.5rem,6vw,5.5rem)] font-semibold leading-[0.95] tracking-[-0.03em] text-[var(--landing-fg)]">
            One source.
            <br />
            Thirty days of content.
          </h1>

          {/* Subheadline */}
          <p className="mt-7 max-w-[580px] text-base leading-7 text-[var(--landing-muted)] sm:text-[17px] sm:leading-7">
            Recastr ingests a video, podcast, or blog and ships a month of
            platform-ready posts — hooks, tweets, LinkedIn, Reel scripts,
            captions. No prompt wrestling.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              href="#cta"
              className="group inline-flex h-12 items-center justify-center rounded-full bg-[var(--landing-accent)] px-7 text-sm font-semibold text-white transition-all hover:brightness-110"
            >
              Try with a demo project
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </a>
            <a
              href="#workflow"
              className="inline-flex h-12 items-center justify-center rounded-full border border-[var(--landing-line)] px-7 text-sm font-medium text-[var(--landing-fg)] transition-colors hover:bg-[var(--landing-panel)]"
            >
              See the workflow
            </a>
          </div>

          {/* Metrics strip */}
          <div className="mt-20 grid gap-8 border-t border-[var(--landing-line)] pt-8 sm:grid-cols-3">
            <div>
              <p className="text-3xl font-semibold tracking-tight text-[var(--landing-fg)]">
                <AnimatedCounter target={12} suffix="K+" />
              </p>
              <p className="mt-1.5 text-[13px] font-medium uppercase tracking-[0.12em] text-[var(--landing-muted)]">
                Creators
              </p>
            </div>
            <div>
              <p className="text-3xl font-semibold tracking-tight text-[var(--landing-fg)]">
                <AnimatedCounter target={30} /> days
              </p>
              <p className="mt-1.5 text-[13px] font-medium uppercase tracking-[0.12em] text-[var(--landing-muted)]">
                Per upload
              </p>
            </div>
            <div>
              <p className="text-3xl font-semibold tracking-tight text-[var(--landing-fg)]">
                <AnimatedCounter target={5} /> platforms
              </p>
              <p className="mt-1.5 text-[13px] font-medium uppercase tracking-[0.12em] text-[var(--landing-muted)]">
                Out of the box
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─────── FEATURED IN ─────── */}
      <section className="border-y border-[var(--landing-line)] bg-[var(--landing-soft)] overflow-hidden">
        <div className="mx-auto flex max-w-[1200px] flex-col items-center gap-6 px-5 py-10 sm:flex-row sm:gap-10 sm:px-6">
          <p className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--landing-muted)] z-10">
            As featured by
          </p>
          <div className="flex flex-1 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)] gap-10 [--gap:2.5rem]">
            <div className="flex shrink-0 animate-marquee items-center justify-around gap-10 py-1">
              {featuredIn.map((name) => (
                <span
                  key={name}
                  className="whitespace-nowrap text-sm font-medium text-[var(--landing-muted)]/60 transition-colors hover:text-[var(--landing-muted)]"
                >
                  {name}
                </span>
              ))}
            </div>
            <div aria-hidden="true" className="flex shrink-0 animate-marquee items-center justify-around gap-10 py-1">
              {featuredIn.map((name) => (
                <span
                  key={`duplicate-${name}`}
                  className="whitespace-nowrap text-sm font-medium text-[var(--landing-muted)]/60 transition-colors hover:text-[var(--landing-muted)]"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─────── WORKFLOW ─────── */}
      <section id="workflow" className="scroll-mt-20">
        <div className="mx-auto max-w-[1200px] px-5 py-24 sm:px-6">
          <SectionHeader
            eyebrow="The Workflow"
            title="From one upload to a whole quarter of posts."
          />

          <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-[var(--landing-line)] bg-[var(--landing-line)] sm:grid-cols-2 lg:grid-cols-4">
            {workflow.map(({ step, title, body, icon: Icon }) => (
              <article
                key={step}
                className="group relative bg-[var(--landing-bg)] p-6 transition-colors hover:bg-[var(--landing-panel)]"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-medium text-[var(--landing-accent)]">
                    {step}
                  </span>
                  <Icon className="h-4 w-4 text-[var(--landing-muted)]/50 transition-colors group-hover:text-[var(--landing-accent)]" />
                </div>
                <h3 className="mt-10 text-lg font-semibold tracking-tight">
                  {title}
                </h3>
                <p className="mt-3 text-[13px] leading-relaxed text-[var(--landing-muted)]">
                  {body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ─────── OUTPUTS ─────── */}
      <section
        id="outputs"
        className="scroll-mt-20 border-y border-[var(--landing-line)] bg-[var(--landing-soft)]"
      >
        <div className="mx-auto max-w-[1200px] px-5 py-24 sm:px-6">
          <SectionHeader
            eyebrow="The Outputs"
            title="Every platform, written in your voice."
            body="Tuned per channel — character counts, hook conventions, hashtag rhythm."
          />

          <div className="mt-14 grid gap-4 md:grid-cols-2">
            {outputPlatforms.map(({ name, badge, quote, details }) => (
              <article
                key={name}
                className="group rounded-2xl border border-[var(--landing-line)] bg-[var(--landing-bg)] p-6 transition-colors hover:border-[var(--landing-muted)]/30"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold tracking-tight">
                    {name}
                  </h3>
                  <span className="rounded-full bg-[var(--landing-panel)] px-2.5 py-0.5 font-mono text-[10px] font-medium text-[var(--landing-accent)]">
                    {badge}
                  </span>
                </div>
                <blockquote className="mt-8 text-lg font-medium leading-7 italic text-[var(--landing-fg)]/90">
                  &ldquo;{quote}&rdquo;
                </blockquote>
                <p className="mt-6 text-xs leading-relaxed text-[var(--landing-muted)]">
                  {details}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ─────── PRICING ─────── */}
      <section
        id="pricing"
        className="scroll-mt-20 border-y border-[var(--landing-line)] bg-[var(--landing-soft)]"
      >
        <div className="mx-auto max-w-[1200px] px-5 py-24 sm:px-6">
          <SectionHeader
            eyebrow="The Pricing"
            title="Honest pricing. No seat tax."
          />

          <div className="mt-14 grid gap-4 lg:grid-cols-3">
            {plans.map(
              ({ name, price, period, description, features, cta, featured }) => (
                <article
                  key={name}
                  className={`relative rounded-2xl border p-6 transition-colors ${
                    featured
                      ? "border-[var(--landing-accent)]/50 bg-[var(--landing-bg)]"
                      : "border-[var(--landing-line)] bg-[var(--landing-bg)]"
                  }`}
                >
                  {featured && (
                    <span className="absolute -top-3 left-6 rounded-full bg-[var(--landing-accent)] px-3 py-0.5 text-[11px] font-semibold text-white">
                      Most Loved
                    </span>
                  )}
                  <h3 className="text-base font-semibold">{name}</h3>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-semibold tracking-tight">
                      {price}
                    </span>
                    <span className="text-sm text-[var(--landing-muted)]">
                      {period}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-[var(--landing-muted)]">
                    {description}
                  </p>
                  <ul className="mt-8 space-y-3">
                    {features.map((f) => (
                      <li
                        key={f}
                        className="flex items-start gap-3 text-sm text-[var(--landing-muted)]"
                      >
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--landing-accent)]" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <a
                    href="#cta"
                    className={`mt-8 inline-flex h-11 w-full items-center justify-center rounded-full text-sm font-semibold transition-all ${
                      featured
                        ? "bg-[var(--landing-accent)] text-white hover:brightness-110"
                        : "bg-[var(--landing-panel)] text-[var(--landing-fg)] hover:bg-[var(--landing-accent)] hover:text-white"
                    }`}
                  >
                    {cta}
                  </a>
                </article>
              )
            )}
          </div>
        </div>
      </section>

      {/* ─────── FAQ ─────── */}
      <section className="mx-auto max-w-[1200px] px-5 py-24 sm:px-6">
        <SectionHeader
          eyebrow="FAQ"
          title="Answers before you start."
        />
        <div className="mt-12 border-t border-[var(--landing-line)]">
          {faqs.map(({ q, a }) => (
            <FaqItem key={q} question={q} answer={a} />
          ))}
        </div>
      </section>

      {/* ─────── FINAL CTA ─────── */}
      <section id="cta" className="mx-auto max-w-[1200px] px-5 pb-24 sm:px-6 scroll-mt-20">
        <div className="relative overflow-hidden rounded-3xl bg-[var(--landing-fg)] p-8 text-[var(--landing-bg)] sm:p-14">
          {/* Subtle accent */}
          <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-violet-400/20 blur-[80px]" />

          <p className="relative text-xs font-semibold uppercase tracking-[0.2em] text-[var(--landing-bg)]/50">
            Ready?
          </p>
          <h2 className="relative mt-4 max-w-[600px] font-display text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
            Stop posting less. Start shipping more.
          </h2>
          <p className="relative mt-4 max-w-md text-sm leading-relaxed text-[var(--landing-bg)]/60">
            Free to try with three demo projects. No credit card, no prompt
            prison.
          </p>

          <form
            className="relative mt-8 flex max-w-md flex-col gap-3 sm:flex-row"
            onSubmit={(e) => e.preventDefault()}
          >
            <input
              type="email"
              placeholder="your@studio.com"
              className="h-12 flex-1 rounded-full border border-[var(--landing-bg)]/10 bg-[var(--landing-bg)]/5 px-5 text-sm text-[var(--landing-bg)] placeholder:text-[var(--landing-bg)]/40 outline-none focus:border-[var(--landing-accent)] focus:ring-2 focus:ring-[var(--landing-accent)]/20 transition-all"
            />
            <button
              type="submit"
              className="group inline-flex h-12 items-center justify-center rounded-full bg-[var(--landing-bg)] px-6 text-sm font-semibold text-[var(--landing-fg)] transition-all hover:opacity-90"
            >
              Get my pack
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          </form>
        </div>
      </section>

      {/* ─────── FOOTER ─────── */}
      <footer className="border-t border-[var(--landing-line)]">
        <div className="mx-auto max-w-[1200px] px-5 py-14 sm:px-6">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
            {/* Brand */}
            <div className="lg:col-span-2">
              <Link
                href="/"
                className="flex items-center gap-2.5"
                aria-label="Recastr home"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--landing-accent)]">
                  <Sparkles className="h-3.5 w-3.5 text-white" />
                </span>
                <span className="font-display text-sm font-semibold">
                  Recastr
                </span>
              </Link>
              <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-[var(--landing-muted)]">
                One source. Thirty days of content. Made for creators who&apos;d
                rather make than schedule.
              </p>
            </div>

            {/* Link columns */}
            {Object.entries(footerLinks).map(([heading, links]) => (
              <div key={heading}>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--landing-muted)]">
                  {heading}
                </p>
                <ul className="mt-4 space-y-2.5">
                  {links.map((link) => (
                    <li key={link}>
                      <a
                        href={footerHref[link]}
                        className="text-[13px] text-[var(--landing-muted)]/70 transition-colors hover:text-[var(--landing-fg)]"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-14 flex flex-col gap-3 border-t border-[var(--landing-line)] pt-6 text-[11px] text-[var(--landing-muted)]/60 sm:flex-row sm:items-center sm:justify-between">
            <p>&copy; 2026 Recastr Labs. All rights reserved.</p>
            <p className="italic">Crafted with coffee and small batches.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}

/* ─────────── SECTION HEADER ─────────── */
function SectionHeader({
  body,
  eyebrow,
  title,
}: {
  body?: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="max-w-2xl">
      <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[var(--landing-accent)]">
        {eyebrow}
      </p>
      <h2 className="mt-4 font-display text-3xl font-semibold leading-tight tracking-tight sm:text-[2.75rem] sm:leading-[1.1]">
        {title}
      </h2>
      {body && (
        <p className="mt-5 text-base leading-7 text-[var(--landing-muted)]">
          {body}
        </p>
      )}
    </div>
  );
}
