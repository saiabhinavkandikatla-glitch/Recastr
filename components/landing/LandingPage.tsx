"use client";

import Link from "next/link";
import { useState } from "react";
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
    title: "Extract hooks",
    body: "Recastr pulls out strong angles and gives you hook options to review.",
    icon: Zap,
  },
  {
    step: "03",
    title: "Draft platform posts",
    body: "Generate short posts, LinkedIn drafts, captions, scripts, and community updates from the same source.",
    icon: Edit3,
  },
  {
    step: "04",
    title: "Review and schedule",
    body: "Edit the drafts, check character counts, then schedule an email reminder when it is time to post.",
    icon: Send,
  },
] as const;

const outputPlatforms = [
  {
    name: "Twitter / X Thread",
    badge: "SHORT POST",
    quote: "Turn the strongest idea into a concise post with a clear next step.",
    details: "Draft copy, character count, and platform preview.",
  },
  {
    name: "Reel Script",
    badge: "SCRIPT DRAFT",
    quote: "Convert the source into a short talking-point script for video.",
    details: "Opening line, body beats, and caption draft.",
  },
  {
    name: "LinkedIn",
    badge: "LONG FORM",
    quote: "Shape the idea into a professional post you can edit before publishing.",
    details: "Readable structure, post body, and preview.",
  },
  {
    name: "Instagram Caption",
    badge: "CAPTION",
    quote: "Draft caption copy from the same source without rewriting from scratch.",
    details: "Caption body, hashtags when useful, and preview.",
  },
] as const;


const plans = [
  {
    name: "Spark",
    price: "$0",
    period: "forever free",
    description: "Test drive with sample projects.",
    features: [
      "3 starter projects",
      "All output formats",
      "Manual copy and export",
    ],
    cta: "Get started",
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
      "Scheduled email reminders",
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
      "Higher source limits",
      "Brand voice training",
      "Team workspace planning",
      "Priority support",
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
    a: "Yes. Get started with 3 starter projects and upgrade when Recastr becomes part of your weekly publishing flow.",
  },
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
  Changelog: "#",
  About: "#",
  Manifesto: "#",
  Careers: "mailto:hello@recastr.app",
  Press: "mailto:hello@recastr.app",
  "Hook Library": "#",
  Docs: "#",
  Support: "mailto:hello@recastr.app",
  Status: "https://status.vercel.com",
};

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
        className={`transition-all duration-300 ease-in-out overflow-hidden ${open ? "max-h-48 pb-6 opacity-100" : "max-h-0 opacity-0"}`}
      >
        <div>
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
  const [isAnnual, setIsAnnual] = useState(false);

  const handleScrollToPricing = (e: React.MouseEvent) => {
    e.preventDefault();
    const element = document.getElementById("pricing");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

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
              href="#pricing"
              onClick={handleScrollToPricing}
              className="inline-flex h-9 items-center rounded-full bg-[var(--landing-fg)] px-4 text-[13px] font-semibold text-[var(--landing-bg)] transition-all hover:opacity-90"
            >
              Get started
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
          <div className="group/badge relative mb-8 inline-flex items-center gap-2 rounded-full border border-[var(--landing-line)] bg-[var(--landing-panel)] px-4 py-1.5 cursor-help">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-medium text-[var(--landing-muted)]">
              New
            </span>
            <span className="text-xs font-medium text-[var(--landing-fg)]">
              Viral Hook Intelligence v2
            </span>
            <div className="absolute left-1/2 top-full z-10 mt-2 w-72 -translate-x-1/2 rounded-xl border border-[var(--landing-line)] bg-[var(--landing-bg)] p-3 text-left text-xs leading-relaxed text-[var(--landing-muted)] opacity-0 pointer-events-none group-hover/badge:opacity-100 transition-opacity duration-200 shadow-xl">
              <p className="font-semibold text-[var(--landing-fg)] mb-1">Viral Hook Intelligence v2</p>
              An upgraded analysis engine that scores hooks against high-engagement formats, providing higher conversion templates with zero prompt engineering.
            </div>
          </div>

          {/* Headline */}
          <h1
            className="max-w-[820px] font-display text-[clamp(2.5rem,6vw,5.5rem)] font-semibold leading-[0.95] tracking-[-0.03em] text-[var(--landing-fg)]"
            aria-label="One source. Thirty days of content."
          >
            <span>One source.</span>{" "}
            <br />
            <span>Thirty days of content.</span>
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
              href="#pricing"
              onClick={handleScrollToPricing}
              className="group inline-flex h-12 items-center justify-center rounded-full bg-[var(--landing-accent)] px-7 text-sm font-semibold text-white transition-all hover:brightness-110"
            >
              Get started
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </a>
            <a
              href="#workflow"
              className="inline-flex h-12 items-center justify-center rounded-full border border-[var(--landing-line)] px-7 text-sm font-medium text-[var(--landing-fg)] transition-colors hover:bg-[var(--landing-panel)]"
            >
              See the workflow
            </a>
          </div>

          {/* Honest product facts */}
          <div className="mt-20 grid gap-8 border-t border-[var(--landing-line)] pt-8 sm:grid-cols-3">
            <div>
              <p className="text-3xl font-semibold tracking-tight text-[var(--landing-fg)]">
                4 inputs
              </p>
              <p className="mt-1.5 text-[13px] font-medium uppercase tracking-[0.12em] text-[var(--landing-muted)]">
                URL, audio, blog, text
              </p>
            </div>
            <div>
              <p className="text-3xl font-semibold tracking-tight text-[var(--landing-fg)]">
                Manual review
              </p>
              <p className="mt-1.5 text-[13px] font-medium uppercase tracking-[0.12em] text-[var(--landing-muted)]">
                Before anything posts
              </p>
            </div>
            <div>
              <p className="text-3xl font-semibold tracking-tight text-[var(--landing-fg)]">
                Email reminders
              </p>
              <p className="mt-1.5 text-[13px] font-medium uppercase tracking-[0.12em] text-[var(--landing-muted)]">
                For scheduled drafts
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─────── WORKFLOW ─────── */}
      <section id="workflow" className="scroll-mt-20">
        <div className="mx-auto max-w-[1200px] px-5 py-24 sm:px-6">
          <SectionHeader
            eyebrow="The Workflow"
            title="From one source to ready-to-review drafts."
          />

          <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-[var(--landing-line)] bg-[var(--landing-line)] sm:grid-cols-2 lg:grid-cols-4">
            {workflow.map(({ step, title, body, icon: Icon }, index) => (
              <article
                key={step}
                className="group relative bg-[var(--landing-bg)] p-6 transition-colors hover:bg-[var(--landing-panel)]"
              >
                {index < workflow.length - 1 && (
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-20 hidden lg:flex h-6 w-6 items-center justify-center rounded-full border border-[var(--landing-line)] bg-[var(--landing-bg)] text-[var(--landing-accent)] shadow-sm">
                    <ArrowRight className="h-3 w-3" />
                  </div>
                )}
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

          <div className="mt-8 flex items-center justify-center gap-3">
            <span className={`text-sm font-medium transition-colors ${!isAnnual ? "text-[var(--landing-fg)]" : "text-[var(--landing-muted)]"}`}>
              Monthly billing
            </span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-[var(--landing-line)] transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--landing-accent)] focus:ring-offset-2"
              role="switch"
              aria-checked={isAnnual}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  isAnnual ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
            <span className={`text-sm font-medium transition-colors flex items-center gap-1.5 ${isAnnual ? "text-[var(--landing-fg)]" : "text-[var(--landing-muted)]"}`}>
              Annual billing
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                Save 20%
              </span>
            </span>
          </div>

          <div className="mt-14 grid gap-4 lg:grid-cols-3">
            {plans.map((p) => {
              const price = p.name === "Creator"
                ? (isAnnual ? "$19" : "$24")
                : p.name === "Studio"
                ? (isAnnual ? "$64" : "$79")
                : p.price;
              const period = p.name === "Creator"
                ? (isAnnual ? "/month — billed annually" : "/month — billed monthly")
                : p.name === "Studio"
                ? (isAnnual ? "/month — billed annually" : "/month — for teams")
                : p.period;
              const href = p.cta === "Talk to us"
                ? "mailto:hello@recastr.app?subject=Recastr%20Studio%20Plan%20Inquiry"
                : "/signup";

              return (
                <article
                  key={p.name}
                  className={`relative rounded-2xl border p-6 transition-colors ${
                    p.featured
                      ? "border-[var(--landing-accent)]/50 bg-[var(--landing-bg)]"
                      : "border-[var(--landing-line)] bg-[var(--landing-bg)]"
                  }`}
                >
                  {p.featured && (
                    <span className="absolute -top-3 left-6 rounded-full bg-[var(--landing-accent)] px-3 py-0.5 text-[11px] font-semibold text-white">
                      Recommended
                    </span>
                  )}
                  <h3 className="text-base font-semibold">{p.name}</h3>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-semibold tracking-tight">
                      {price}
                    </span>
                    <span className="text-sm text-[var(--landing-muted)]">
                      {period}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-[var(--landing-muted)]">
                    {p.description}
                  </p>
                  <ul className="mt-8 space-y-3">
                    {p.features.map((f) => (
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
                    href={href}
                    className={`mt-8 inline-flex h-11 w-full items-center justify-center rounded-full text-sm font-semibold transition-all ${
                      p.featured
                        ? "bg-[var(--landing-accent)] text-white hover:brightness-110"
                        : "bg-[var(--landing-panel)] text-[var(--landing-fg)] hover:bg-[var(--landing-accent)] hover:text-white"
                    }`}
                  >
                    {p.cta}
                  </a>
                </article>
              );
            })}
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
            Free to try with three starter projects. No credit card, no prompt
            prison.
          </p>

          <div className="relative mt-8 flex max-w-md">
            <a
              href="#pricing"
              onClick={handleScrollToPricing}
              className="group inline-flex h-12 items-center justify-center rounded-full bg-[var(--landing-bg)] px-7 text-sm font-semibold text-[var(--landing-fg)] transition-all hover:opacity-90"
            >
              Get started
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </a>
          </div>
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
