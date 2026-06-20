"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export function FAQSection() {
  return (
    <section id="faq" className="border-t border-[#232323] py-36">
      <div className="mx-auto max-w-4xl px-6">

        <h2 className="mb-16 text-center text-5xl font-bold">
          Frequently Asked Questions
        </h2>

        <Accordion type="single" collapsible>

          <AccordionItem value="1">
            <AccordionTrigger>
              What content can I upload?
            </AccordionTrigger>

            <AccordionContent>
              You can upload YouTube video URLs, podcast audio files (MP3/WAV), or paste in a blog post URL or raw text. We support files up to 500MB on Pro and Business plans.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="2">
            <AccordionTrigger>
              Which platforms are supported?
            </AccordionTrigger>

            <AccordionContent>
              Recastr generates content for LinkedIn (long-form posts), X/Twitter (threads up to 10 tweets), Instagram (captions + hashtags), and Instagram Reels (spoken scripts with timestamps).
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="3">
            <AccordionTrigger>
              Can I schedule posts?
            </AccordionTrigger>

            <AccordionContent>
              Yes — on Pro and Business plans you can set a publish date and time per post. Recastr sends you an email reminder when it&apos;s time to post. Direct auto-publishing is coming soon.
            </AccordionContent>
          </AccordionItem>

        </Accordion>

      </div>
    </section>
  );
}
