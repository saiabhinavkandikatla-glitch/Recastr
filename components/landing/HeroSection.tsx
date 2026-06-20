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
    const ctaSection = document.getElementById("cta");
    if (ctaSection) {
      ctaSection.scrollIntoView({ behavior: "smooth" });
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
          Content repurposing workspace
        </motion.div>

        <motion.h1 variants={itemVariants} className="max-w-5xl text-5xl font-bold leading-tight text-white md:text-7xl">
          Turn Long-Form Content Into Ready-to-Use Posts
        </motion.h1>

        <motion.p variants={itemVariants} className="mt-8 max-w-2xl text-lg leading-8 text-[#8A8A8A]">
          Upload videos, podcasts, blogs and documents. Generate LinkedIn posts, X threads, captions and summaries without starting from scratch.
        </motion.p>

        <motion.div variants={itemVariants} className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <MagneticWrapper>
            <Button size="lg" asChild>
              <Link href="#cta" onClick={handleGetStartedClick}>Start Free</Link>
            </Button>
          </MagneticWrapper>

          <MagneticWrapper>
            <Button variant="secondary" size="lg" asChild>
              <Link href="#workflow" onClick={handleDemoClick}>View Demo</Link>
            </Button>
          </MagneticWrapper>
        </motion.div>

        <motion.div variants={itemVariants} className="mt-24 w-full max-w-4xl text-center">
          <p className="text-lg leading-8 text-[#8A8A8A] font-medium">
            Built for creators, founders and teams who want to repurpose content efficiently.
          </p>
        </motion.div>
      </motion.div>
    </section>
  );
}
