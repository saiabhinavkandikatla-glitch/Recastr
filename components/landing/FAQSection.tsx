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
              Videos, podcasts and blogs.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="2">
            <AccordionTrigger>
              Which platforms are supported?
            </AccordionTrigger>

            <AccordionContent>
              LinkedIn, X and Instagram.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="3">
            <AccordionTrigger>
              Can I schedule posts?
            </AccordionTrigger>

            <AccordionContent>
              Yes, with the Pro plan.
            </AccordionContent>
          </AccordionItem>

        </Accordion>

      </div>
    </section>
  );
}
