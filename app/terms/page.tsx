import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/Navbar";

const sections = [
  {
    title: "Acceptance of terms",
    body: "By accessing or using Recastr, you agree to these Terms of Service and any policies referenced here. If you do not agree, do not use the service.",
  },
  {
    title: "The service",
    body: "Recastr helps users upload or paste source content, analyze it, generate platform-ready drafts, manage projects, and schedule reminder workflows. Features may change as the product evolves.",
  },
  {
    title: "Your content and responsibilities",
    body: "You retain rights to content you upload and drafts generated for your workspace. You are responsible for having permission to use uploaded materials and for reviewing all generated content before publishing.",
  },
  {
    title: "AI-generated output",
    body: "AI-generated drafts may be inaccurate, incomplete, or similar to other content. Recastr does not guarantee that generated output is error-free, legally compliant, or suitable for every use case.",
  },
  {
    title: "Accounts, billing, and acceptable use",
    body: "You are responsible for maintaining account security and for payment obligations associated with paid plans. You may not use Recastr to violate laws, infringe rights, distribute harmful content, or interfere with the service.",
  },
  {
    title: "Contact",
    body: "Questions about these Terms can be sent to support@recastr.app.",
  },
];

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1 bg-background pb-16 pt-32">
        <div className="mx-auto max-w-3xl px-6 text-foreground">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Recastr Labs
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight">Terms of Service</h1>
          <p className="mt-4 text-muted-foreground">Last updated: June 25, 2026</p>
          <div className="mt-10 space-y-8">
            {sections.map((section, index) => (
              <section key={section.title}>
                <h2 className="text-2xl font-semibold">
                  {index + 1}. {section.title}
                </h2>
                <p className="mt-3 leading-relaxed text-muted-foreground">{section.body}</p>
              </section>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
