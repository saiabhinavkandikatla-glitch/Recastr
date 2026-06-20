import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "Recastr — Contact",
  description: "Get in touch with the Recastr team.",
};

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-[#090909] text-white">
      <Navbar />
      <div className="mx-auto max-w-2xl px-6 py-24 text-center">
        <h1 className="text-4xl font-bold tracking-tight">Contact</h1>
        <p className="mt-4 text-lg text-[#8A8A8A]">
          Questions about your account, billing, or the product? We read every message.
        </p>
        <a
          href="mailto:recastr.schedule@gmail.com"
          className="mt-8 inline-flex rounded-full bg-white px-8 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-90"
        >
          recastr.schedule@gmail.com
        </a>
        <p className="mt-10 text-sm text-[#71717a]">
          Studio and team plans: mention &quot;Studio&quot; in the subject line.{" "}
          <Link href="/docs" className="text-white underline-offset-4 hover:underline">
            Read the docs
          </Link>
        </p>
      </div>
      <Footer />
    </main>
  );
}
