import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1 bg-background pt-32 pb-16">
        <div className="mx-auto max-w-3xl px-6 text-foreground">
          <h1 className="text-4xl font-bold tracking-tight">Privacy Policy</h1>
          <p className="mt-4 text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
          
          <div className="mt-10 space-y-8">
            <section>
              <h2 className="text-2xl font-semibold">1. Information We Collect</h2>
              <p className="mt-3 leading-relaxed text-muted-foreground">
                We collect information you provide directly to us, such as when you create or modify your account, request on-demand services, contact customer support, or otherwise communicate with us. This information may include: name, email, phone number, postal address, profile picture, payment method, and other information you choose to provide.
              </p>
            </section>
            
            <section>
              <h2 className="text-2xl font-semibold">2. Use of Information</h2>
              <p className="mt-3 leading-relaxed text-muted-foreground">
                We may use the information we collect about you to provide, maintain, and improve our services, including to facilitate payments, send receipts, provide products and services you request, develop new features, provide customer support to Users and Drivers, develop safety features, authenticate users, and send product updates and administrative messages.
              </p>
            </section>
            
            <section>
              <h2 className="text-2xl font-semibold">3. Sharing of Information</h2>
              <p className="mt-3 leading-relaxed text-muted-foreground">
                We may share the information we collect about you as described in this Statement or as described at the time of collection or sharing, including as follows: with third parties to provide you a service you requested through a partnership or promotional offering made by a third party or us.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold">4. Contact Us</h2>
              <p className="mt-3 leading-relaxed text-muted-foreground">
                If you have any questions about this Privacy Policy, please contact us at support@recastr.app.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
