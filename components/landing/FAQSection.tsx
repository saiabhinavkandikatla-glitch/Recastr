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
              How does Recastr repurpose content?
            </AccordionTrigger>

            <AccordionContent>
              Recastr uses advanced AI to extract insights and generate platform-optimized posts from YouTube URLs or text.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="2">
            <AccordionTrigger>
              What platforms are supported?
            </AccordionTrigger>

            <AccordionContent>
              LinkedIn, Twitter/X, Instagram, Facebook, Threads, and YouTube Community.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="3">
            <AccordionTrigger>
              Can I customize the brand voice?
            </AccordionTrigger>

            <AccordionContent>
              Yes, you can upload reference copy to define custom tones and brand voices.
            </AccordionContent>
          </AccordionItem>

        </Accordion>

      </div>
    </section>
  );
}
