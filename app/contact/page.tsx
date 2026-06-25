import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";

export default function ContactPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1 bg-background pt-32 pb-16">
        <div className="mx-auto max-w-3xl px-6 text-foreground">
          <h1 className="text-4xl font-bold tracking-tight">Contact Us</h1>
          <p className="mt-4 text-lg text-muted-foreground">We&apos;re here to help and answer any question you might have.</p>
          
          <div className="mt-12 rounded-2xl border border-[var(--app-line)] bg-[var(--app-surface)] p-8">
            <h2 className="text-2xl font-semibold">Get in touch</h2>
            <p className="mt-3 text-muted-foreground">
              For general inquiries, support, or feedback, please email us directly. We aim to respond to all inquiries within 24-48 hours.
            </p>
            
            <div className="mt-8">
              <a
                href="mailto:support@recastr.app"
                className="inline-flex h-11 items-center justify-center rounded-full bg-[var(--violet)] px-8 text-sm font-semibold text-black transition-colors hover:bg-[var(--violet-hover)]"
              >
                Email Support
              </a>
            </div>
            
            <div className="mt-10 border-t border-[var(--app-line)] pt-8">
              <h3 className="font-medium text-foreground">Connect with us</h3>
              <div className="mt-4 flex gap-4">
                <a href="https://x.com/recastr" target="_blank" rel="noopener noreferrer" className="text-[#8a8a8a] hover:text-white transition-colors">
                  X (Twitter)
                </a>
                <a href="https://linkedin.com/company/recastr" target="_blank" rel="noopener noreferrer" className="text-[#8a8a8a] hover:text-white transition-colors">
                  LinkedIn
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
