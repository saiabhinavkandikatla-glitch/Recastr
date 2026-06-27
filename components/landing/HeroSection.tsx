"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { MagneticWrapper } from "./MagneticWrapper";

export function HeroSection() {
  const handleDemoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const demoSection = document.getElementById("workflow");
    if (demoSection) {
      demoSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleGetStartedClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const ctaSection = document.getElementById("cta");
    if (ctaSection) {
      ctaSection.scrollIntoView({ behavior: "smooth" });
    }
  };


  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
  };

  return (
    <section className="relative overflow-hidden">
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="mx-auto flex min-h-[85vh] max-w-7xl flex-col items-center justify-center px-6 text-center"
      >
        <motion.div variants={itemVariants} className="mb-6 rounded-full border border-[#232323] bg-[#111111] px-4 py-2 text-sm text-[#8A8A8A]">
          Content repurposing workspace
        </motion.div>

        <motion.h1 variants={itemVariants} className="max-w-5xl text-5xl font-bold leading-tight text-white md:text-7xl">
          Turn Long-Form Content Into Ready-to-Use Posts
        </motion.h1>

        <motion.p variants={itemVariants} className="mt-8 max-w-2xl text-lg leading-8 text-[#8A8A8A]">
          Upload videos, podcasts, blogs and documents. Generate LinkedIn posts, X threads, Instagram captions, Facebook updates, Threads and YouTube Community posts without starting from scratch.
        </motion.p>

        <motion.div variants={itemVariants} className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <MagneticWrapper>
            <Button size="lg" asChild>
              <Link href="#cta" onClick={handleGetStartedClick}>Start Free</Link>
            </Button>
          </MagneticWrapper>

          <MagneticWrapper>
            <Button variant="secondary" size="lg" asChild>
              <Link href="#workflow" onClick={handleDemoClick}>Watch Demo</Link>
            </Button>
          </MagneticWrapper>
        </motion.div>

        <motion.div variants={itemVariants} className="mt-24 w-full max-w-6xl rounded-[32px] border border-[#232323] bg-[#111111]/30 p-8">
          <div className="grid gap-6 md:grid-cols-3">
            {/* Card 1 */}
            <div className="rounded-3xl border border-[#232323] bg-[#151515]/30 p-6 text-left transition-all duration-300 hover:border-white/10 hover:bg-[#1A1A1A]/30">
              <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8A8A8A]">
                Supported Inputs
              </h3>
              <ul className="mt-5 space-y-3">
                {[
                  "YouTube Videos",
                  "Podcasts",
                  "Blogs",
                  "Documents",
                  "Long-form Content"
                ].map((input) => (
                  <li key={input} className="flex items-start gap-2.5 text-sm text-[#8A8A8A]">
                    <svg className="h-3.5 w-3.5 text-zinc-600 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m9 18 6-6-6-6"/>
                    </svg>
                    <span>{input}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Card 2 */}
            <div className="rounded-3xl border border-[#232323] bg-[#151515]/30 p-6 text-left transition-all duration-300 hover:border-white/10 hover:bg-[#1A1A1A]/30">
              <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8A8A8A]">
                Generated Formats
              </h3>
              <ul className="mt-5 space-y-3">
                {[
                  "LinkedIn Posts",
                  "X Threads",
                  "Captions",
                  "Summaries",
                  "Scripts",
                  "Notes"
                ].map((format) => (
                  <li key={format} className="flex items-start gap-2.5 text-sm text-[#8A8A8A]">
                    <svg className="h-3.5 w-3.5 text-zinc-600 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m9 18 6-6-6-6"/>
                    </svg>
                    <span>{format}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Card 3 */}
            <div className="rounded-3xl border border-[#232323] bg-[#151515]/30 p-6 text-left transition-all duration-300 hover:border-white/10 hover:bg-[#1A1A1A]/30">
              <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8A8A8A]">
                Supported Platforms
              </h3>
              <ul className="mt-5 space-y-3">
                {[
                  "LinkedIn",
                  "X",
                  "Instagram",
                  "Threads",
                  "Facebook",
                  "Medium",
                  "Reddit",
                  "Blogs",
                  "Newsletters",
                  "YouTube Descriptions"
                ].map((platform) => (
                  <li key={platform} className="flex items-start gap-2.5 text-sm text-[#8A8A8A]">
                    <svg className="h-3.5 w-3.5 text-zinc-600 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m9 18 6-6-6-6"/>
                    </svg>
                    <span>{platform}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
