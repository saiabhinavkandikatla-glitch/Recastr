import type { Metadata } from "next";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "Recastr — Blog",
  description: "Product updates, creator tips, and news from Recastr.",
};

export default function BlogPage() {
  return (
    <main className="min-h-screen bg-[#090909] text-white">
      <Navbar />
      
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-6">
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
          Blog
        </h1>
        <p className="mt-4 text-[#8A8A8A] text-lg">
          Blog Coming Soon
        </p>
      </div>

      <Footer />
    </main>
  );
}
