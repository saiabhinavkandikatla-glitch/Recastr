"use client";

import { motion } from "framer-motion";

export function PlatformSection() {
  const formats = [
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
  ];

  return (
    <section className="border-t border-[#232323] py-36">
      <div className="mx-auto max-w-7xl px-6 text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-[#8A8A8A]">
          Formats
        </p>

        <h2 className="mt-6 text-5xl font-bold text-white font-display tracking-tight">
          Supported Formats
        </h2>

        <p className="mx-auto mt-6 max-w-2xl text-lg text-[#8A8A8A]">
          Generate content tailored for multiple platforms and formats.
        </p>

        <div className="mt-16 flex flex-wrap justify-center gap-3 max-w-4xl mx-auto">
          {formats.map((format, idx) => (
            <motion.div
              key={format}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.05, duration: 0.4 }}
              className="rounded-full border border-[#232323] bg-[#111111]/60 px-6 py-3 text-sm font-semibold text-slate-200 transition-colors hover:border-white/30 hover:bg-[#151515]"
            >
              {format}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
