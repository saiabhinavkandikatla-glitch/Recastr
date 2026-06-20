"use client";

import { useEffect, useState } from "react";
import { Navbar } from "./Navbar";
import { HeroSection } from "./HeroSection";
import { WorkflowSection } from "./WorkflowSection";
import { FeatureGrid } from "./FeatureGrid";
import { PricingSection } from "./PricingSection";
import { FAQSection } from "./FAQSection";
import { CTASection } from "./CTASection";
import { Footer } from "./Footer";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp } from "lucide-react";

export function LandingPage() {
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
  };

  return (
    <main className="relative min-h-screen bg-[#090909] text-white selection:bg-white selection:text-black">
      <Navbar />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
      >
        <motion.div variants={itemVariants}>
          <HeroSection />
        </motion.div>

        <motion.div variants={itemVariants}>
          <WorkflowSection />
        </motion.div>

        <motion.div variants={itemVariants}>
          <FeatureGrid />
        </motion.div>

        <motion.div variants={itemVariants}>
          <PricingSection />
        </motion.div>

        <motion.div variants={itemVariants}>
          <FAQSection />
        </motion.div>

        <motion.div variants={itemVariants}>
          <CTASection />
        </motion.div>
      </motion.div>

      <Footer />

      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={scrollToTop}
            className="fixed bottom-8 right-8 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-[#232323] bg-[#111111]/85 text-[#8A8A8A] backdrop-blur hover:text-white transition-all shadow-[0_4px_20px_rgba(0,0,0,0.5)] active:scale-95"
            aria-label="Scroll to top"
          >
            <ArrowUp className="h-5 w-5" />
          </motion.button>
        )}
      </AnimatePresence>
    </main>
  );
}
