import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/Navbar";

const sections = [
  {
    title: "Information we collect",
    body: "We collect account details such as name, email address, authentication data, workspace settings, uploaded source content, generated drafts, scheduling preferences, and support messages. If you connect third-party services or payment providers, those providers may send us limited information needed to operate your account.",
  },
  {
    title: "How we use information",
    body: "We use your information to provide Recastr, process uploads, generate content, save projects, send reminders, secure accounts, provide support, improve product reliability, and communicate important service updates.",
  },
  {
    title: "AI processing",
    body: "Source content and transcripts may be processed by AI providers to extract insights and create draft posts. We do not sell uploaded source content. You are responsible for reviewing generated drafts before publishing them.",
  },
  {
    title: "Sharing and service providers",
    body: "We share information only with service providers that help us run Recastr, such as hosting, authentication, analytics, email, payment, database, and AI infrastructure providers. We may also disclose information if required by law or to protect users and the service.",
  },
  {
    title: "Data retention and choices",
    body: "We retain account and project data while your account is active or as needed for legal, security, and operational purposes. You may request deletion or correction of your data by contacting support@recastr.app.",
  },
  {
    title: "Contact",
    body: "Questions about this Privacy Policy can be sent to support@recastr.app.",
  },
];

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1 bg-background pb-16 pt-32">
        <div className="mx-auto max-w-3xl px-6 text-foreground">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Recastr Labs
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight">Privacy Policy</h1>
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
