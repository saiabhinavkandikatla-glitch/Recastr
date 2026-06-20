"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { motion } from "framer-motion";
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
    const workflowSection = document.getElementById("workflow");
    if (workflowSection) {
      workflowSection.scrollIntoView({ behavior: "smooth" });
    }
  };


  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const itemVariants = {
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
          AI-powered content repurposing
        </motion.div>

        <motion.h1 variants={itemVariants} className="max-w-5xl text-5xl font-bold leading-tight text-white md:text-7xl">
          Create 30 Content Assets From One Video
        </motion.h1>

        <motion.p variants={itemVariants} className="mt-8 max-w-2xl text-lg leading-8 text-[#8A8A8A]">
          Turn podcasts, YouTube videos and blogs into platform-ready
          LinkedIn posts, X threads, Instagram captions and Reel scripts.
        </motion.p>

        <motion.div variants={itemVariants} className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <MagneticWrapper>
            <Button size="lg" asChild>
              <Link href="#workflow" onClick={handleGetStartedClick}>Get Started</Link>
            </Button>
          </MagneticWrapper>

          <MagneticWrapper>
            <Button variant="secondary" size="lg" asChild>
              <Link href="#workflow" onClick={handleDemoClick}>Watch Demo</Link>
            </Button>
          </MagneticWrapper>
        </motion.div>

        <motion.div variants={itemVariants} className="mt-24 w-full max-w-6xl rounded-[32px] border border-[#232323] bg-[#111111] p-8">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-3xl border border-[#232323] bg-[#151515] p-6 transition-colors hover:border-white/30 hover:bg-[#1A1A1A]">
              <p className="text-sm text-[#8A8A8A]">
                Source
              </p>
              <h3 className="mt-3 text-lg font-semibold text-white">
                YouTube URL / Video
              </h3>
            </div>

            <div className="rounded-3xl border border-[#232323] bg-[#151515] p-6 transition-colors hover:border-white/30 hover:bg-[#1A1A1A]">
              <p className="text-sm text-[#8A8A8A]">
                Generated Posts
              </p>
              <h3 className="mt-3 text-lg font-semibold text-white">
                30 Content Assets
              </h3>
            </div>

            <div className="rounded-3xl border border-[#232323] bg-[#151515] p-6 transition-colors hover:border-white/30 hover:bg-[#1A1A1A]">
              <p className="text-sm text-[#8A8A8A]">
                Platforms
              </p>
              <h3 className="mt-3 text-lg font-semibold text-white">
                LinkedIn · X · Instagram · Facebook · Threads · YouTube
              </h3>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
