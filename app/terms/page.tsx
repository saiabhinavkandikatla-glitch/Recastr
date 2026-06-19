import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "Recastr — Terms of Service",
  description: "Terms governing use of the Recastr platform.",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#090909] text-white">
      <Navbar />
      <article className="mx-auto max-w-3xl px-6 py-20 prose prose-invert prose-headings:font-semibold prose-p:text-[#a1a1aa] prose-li:text-[#a1a1aa]">
        <h1>Terms of Service</h1>
        <p className="text-sm text-[#71717a]">Last updated: June 18, 2026</p>

        <p>
          By using Recastr, you agree to these Terms. If you do not agree, do not use the service.
        </p>

        <h2>Service</h2>
        <p>
          Recastr helps you repurpose long-form content into drafts for social platforms. You are responsible for
          reviewing, editing, and publishing all outputs. We do not guarantee reach, engagement, or platform compliance.
        </p>

        <h2>Accounts</h2>
        <p>
          You must provide accurate information and keep credentials secure. You are responsible for activity under
          your account.
        </p>

        <h2>Your content</h2>
        <p>
          You retain ownership of content you submit. You grant Recastr a limited license to process, store, and
          display your content solely to provide the service. You represent that you have rights to the content you upload.
        </p>

        <h2>Acceptable use</h2>
        <ul>
          <li>Do not upload unlawful, infringing, or harmful content.</li>
          <li>Do not attempt to bypass security, abuse APIs, or scrape the service.</li>
          <li>Do not use Recastr to generate spam or deceptive content at scale.</li>
        </ul>

        <h2>Plans and billing</h2>
        <p>
          Paid plans renew according to the billing cycle you select. Fees are non-refundable except where required by law.
          We may change pricing with reasonable notice.
        </p>

        <h2>Disclaimer</h2>
        <p>
          The service is provided &quot;as is&quot; without warranties. We are not liable for indirect or consequential
          damages arising from use of the service.
        </p>

        <h2>Termination</h2>
        <p>
          You may stop using Recastr at any time. We may suspend accounts that violate these Terms or pose security risk.
        </p>

        <h2>Contact</h2>
        <p>
          <a href="mailto:hello@recastr.app">hello@recastr.app</a> · <Link href="/privacy">Privacy Policy</Link>
        </p>
      </article>
      <Footer />
    </main>
  );
}
