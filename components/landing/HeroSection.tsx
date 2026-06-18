"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";

export function HeroSection() {
  const handleDemoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const demoSection = document.getElementById("demo");
    if (demoSection) {
      demoSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleStartFreeClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const ctaSection = document.getElementById("cta");
    if (ctaSection) {
      ctaSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto flex min-h-[85vh] max-w-7xl flex-col items-center justify-center px-6 text-center">

        <div className="mb-6 rounded-full border border-[#232323] bg-[#111111] px-4 py-2 text-sm text-[#8A8A8A]">
          AI-powered content repurposing
        </div>

        <h1 className="max-w-5xl text-5xl font-bold leading-tight text-white md:text-7xl">
          Create 30 Content Assets From One Video
        </h1>

        <p className="mt-8 max-w-2xl text-lg leading-8 text-[#8A8A8A]">
          Turn podcasts, YouTube videos and blogs into platform-ready
          LinkedIn posts, X threads, Instagram captions and Reel scripts.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Button size="lg" asChild>
            <Link href="#cta" onClick={handleStartFreeClick}>Start Now</Link>
          </Button>

          <Button variant="secondary" size="lg" asChild>
            <Link href="#demo" onClick={handleDemoClick}>Watch Demo</Link>
          </Button>
        </div>

        <div className="mt-24 w-full max-w-6xl rounded-[32px] border border-[#232323] bg-[#111111] p-8">

          <div className="grid gap-6 md:grid-cols-3">

            <div className="rounded-3xl border border-[#232323] bg-[#151515] p-6">
              <p className="text-sm text-[#8A8A8A]">
                Source
              </p>

              <h3 className="mt-3 text-lg font-semibold text-white">
                Founder Podcast Episode
              </h3>
            </div>

            <div className="rounded-3xl border border-[#232323] bg-[#151515] p-6">
              <p className="text-sm text-[#8A8A8A]">
                Generated Posts
              </p>

              <h3 className="mt-3 text-lg font-semibold text-white">
                30 Content Assets
              </h3>
            </div>

            <div className="rounded-3xl border border-[#232323] bg-[#151515] p-6">
              <p className="text-sm text-[#8A8A8A]">
                Platforms
              </p>

              <h3 className="mt-3 text-lg font-semibold text-white">
                LinkedIn · X · Instagram
              </h3>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
