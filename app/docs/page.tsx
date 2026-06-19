import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "Recastr — Documentation",
  description: "Getting started with Recastr: sources, outputs, and scheduling.",
};

export default function DocsPage() {
  return (
    <main className="min-h-screen bg-[#090909] text-white">
      <Navbar />

      <article className="mx-auto max-w-3xl px-6 py-20">
        <h1 className="text-4xl font-bold tracking-tight">Getting started</h1>
        <p className="mt-4 text-lg text-[#8A8A8A]">
          Turn one source into platform-ready posts in four steps.
        </p>

        <section className="mt-12 space-y-4">
          <h2 className="text-2xl font-semibold">1. Connect a source</h2>
          <p className="leading-relaxed text-[#a1a1aa]">
            Paste a YouTube URL, upload podcast audio, import a blog link, or paste raw text. Recastr transcribes and
            analyzes the source automatically — no manual copy-paste required.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-2xl font-semibold">2. Review hooks</h2>
          <p className="leading-relaxed text-[#a1a1aa]">
            Recastr extracts the strongest angles and surfaces hook options per platform. Pick the angle that fits your
            voice before generating drafts.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-2xl font-semibold">3. Generate outputs</h2>
          <p className="leading-relaxed text-[#a1a1aa]">
            One source produces up to seven formats: Twitter/X thread, LinkedIn, Instagram caption, Instagram carousel,
            Facebook, YouTube Community, and Reel script. Each draft follows platform-native structure — character
            limits, hook format, and hashtag rhythm included.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-2xl font-semibold">4. Review and schedule</h2>
          <p className="leading-relaxed text-[#a1a1aa]">
            Edit every draft in the workspace. On paid plans, schedule email reminders or post directly to connected
            accounts. On Spark, copy and export manually.
          </p>
        </section>

        <section className="mt-12 rounded-2xl border border-[#232323] bg-[#111] p-6">
          <h2 className="text-lg font-semibold">Need help?</h2>
          <p className="mt-2 text-sm text-[#8A8A8A]">
            Email <a href="mailto:hello@recastr.app" className="text-white hover:underline">hello@recastr.app</a> or
            read the <Link href="/#faq" className="text-white hover:underline">FAQ on the homepage</Link>.
          </p>
        </section>
      </article>

      <Footer />
    </main>
  );
}
