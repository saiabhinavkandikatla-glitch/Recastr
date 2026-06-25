"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export function FAQSection() {
  return (
    <section id="faq" className="border-t border-[#232323] py-36 scroll-mt-20">
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
              You can upload YouTube videos, podcasts, and blog posts. Our AI extracts the core ideas and automatically repurposes them into platform-specific posts.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="2">
            <AccordionTrigger>
              Which platforms are supported?
            </AccordionTrigger>

            <AccordionContent>
              Recastr generates optimized content for LinkedIn, X (Twitter), Instagram, Facebook, Threads, and YouTube Community.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="3">
            <AccordionTrigger>
              Can I schedule posts?
            </AccordionTrigger>

            <AccordionContent>
              Yes! You can organize your posts in your workspace and set a schedule. Recastr will send you an email reminder when it&apos;s time to publish.
            </AccordionContent>
          </AccordionItem>

        </Accordion>

      </div>
    </section>
  );
}
