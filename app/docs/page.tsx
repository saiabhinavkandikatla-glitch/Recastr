import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";

export default function DocsPage() {
  return (
    <main className="min-h-screen bg-[#090909] text-white">
      <Navbar />
      
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-6">
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
          Documentation
        </h1>
        <p className="mt-4 text-[#8A8A8A] text-lg">
          Documentation Under Development
        </p>
      </div>

      <Footer />
    </main>
  );
}
