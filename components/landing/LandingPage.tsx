import { Navbar } from "./Navbar";
import { HeroSection } from "./HeroSection";
import { WorkflowSection } from "./WorkflowSection";
import { FeatureGrid } from "./FeatureGrid";
import { PricingSection } from "./PricingSection";
import { FAQSection } from "./FAQSection";
import { CTASection } from "./CTASection";
import { Footer } from "./Footer";
import { CursorSpotlight } from "./CursorSpotlight";
import { motion } from "framer-motion";

export function LandingPage() {
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
      <CursorSpotlight />
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
    </main>
  );
}
