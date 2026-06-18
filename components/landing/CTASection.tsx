import { Button } from "@/components/ui/button";
import Link from "next/link";

export function CTASection() {
  return (
    <section id="cta" className="border-t border-[#232323] py-36">

      <div className="mx-auto max-w-5xl px-6 text-center">

        <h2 className="text-6xl font-bold">
          Ready To Create
          <br />
          30 Content Assets?
        </h2>

        <p className="mx-auto mt-8 max-w-2xl text-lg text-[#8A8A8A]">
          Generate platform-ready content in minutes.
        </p>

        <Button size="lg" className="mt-12" asChild>
          <Link href="/signup">Start Now</Link>
        </Button>

      </div>
    </section>
  );
}
