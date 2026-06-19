import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "Recastr — Privacy Policy",
  description: "How Recastr collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#090909] text-white">
      <Navbar />
      <article className="mx-auto max-w-3xl px-6 py-20 prose prose-invert prose-headings:font-semibold prose-p:text-[#a1a1aa] prose-li:text-[#a1a1aa]">
        <h1>Privacy Policy</h1>
        <p className="text-sm text-[#71717a]">Last updated: June 18, 2026</p>

        <p>
          Recastr Labs (&quot;Recastr,&quot; &quot;we,&quot; &quot;us&quot;) provides a content repurposing
          platform for creators and teams. This policy explains what we collect, how we use it, and your choices.
        </p>

        <h2>Information we collect</h2>
        <ul>
          <li>Account information: name, email, and authentication credentials.</li>
          <li>Content you upload or link: videos, podcasts, blogs, transcripts, and generated posts.</li>
          <li>Usage data: feature usage, device/browser type, and log data for security and reliability.</li>
          <li>Connected services: if you connect Google OAuth or social accounts, we receive tokens required to post on your behalf.</li>
        </ul>

        <h2>How we use information</h2>
        <ul>
          <li>Provide transcription, analysis, and AI-generated drafts.</li>
          <li>Store your projects, outputs, and scheduling preferences.</li>
          <li>Send transactional email (verification, password reset, scheduled reminders).</li>
          <li>Improve product quality, prevent abuse, and comply with law.</li>
        </ul>

        <h2>AI processing</h2>
        <p>
          Source content is processed by third-party AI providers to generate platform posts. We do not sell your
          source content. Generated outputs are stored in your workspace until you delete them.
        </p>

        <h2>Third-party services</h2>
        <p>
          We use Supabase (auth/database), Vercel (hosting), Google (OAuth and AI where configured), and email
          delivery providers. Each processes data under their own terms.
        </p>

        <h2>Data retention</h2>
        <p>
          We retain account and project data while your account is active. You may request deletion by emailing{" "}
          <a href="mailto:hello@recastr.app">hello@recastr.app</a>.
        </p>

        <h2>Your rights</h2>
        <p>
          Depending on your location, you may have rights to access, correct, export, or delete personal data.
          Contact us to exercise these rights.
        </p>

        <h2>Contact</h2>
        <p>
          Questions: <a href="mailto:hello@recastr.app">hello@recastr.app</a> or visit our{" "}
          <Link href="/contact">contact page</Link>.
        </p>
      </article>
      <Footer />
    </main>
  );
}
