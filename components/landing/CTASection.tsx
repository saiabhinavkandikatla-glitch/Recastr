import { Button } from "@/components/ui/button";
import Link from "next/link";
import { MagneticWrapper } from "./MagneticWrapper";

export function CTASection() {
  return (
    <section id="cta" className="border-t border-[#232323] py-36">

      <div className="mx-auto max-w-5xl px-6 text-center">

        <h2 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl text-white">
          Ready to repurpose your content?
        </h2>

        <p className="mx-auto mt-8 max-w-2xl text-lg text-[#8A8A8A]">
          Generate LinkedIn posts, X threads, captions and summaries without starting from scratch.
        </p>

        <MagneticWrapper>
          <Button size="lg" className="mt-12" asChild>
            <Link href="/signup">Start Free</Link>
          </Button>
        </MagneticWrapper>

      </div>
    </section>
  );
}
