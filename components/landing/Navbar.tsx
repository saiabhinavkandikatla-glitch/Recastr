"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";

const navItems = [
  { name: "Workflow", id: "workflow" },
  { name: "Outputs", id: "outputs" },
  { name: "Pricing", id: "pricing" },
] as const;

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("");

  useEffect(() => {
    const sections = navItems.map((item) => item.id);
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { rootMargin: "-50% 0px -50% 0px" },
    );

    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMobileOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-[#232323]/80 bg-[#090909]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-[60px] max-w-7xl items-center justify-between px-6">
        <Logo size="md" className="text-white" />

        <div className="navbar-links hidden items-center gap-8 md:flex">
          {navItems.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={scrollTo(item.id)}
              className={`nav-link relative pb-1 text-sm transition-colors ${
                activeSection === item.id ? "text-white" : "text-[#8A8A8A] hover:text-white"
              }`}
            >
              {item.name}
              {activeSection === item.id ? (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-white" />
              ) : null}
            </a>
          ))}
        </div>

        <div className="navbar-actions hidden items-center gap-3 md:flex">
          <Button variant="ghost" asChild className="text-[#8A8A8A] hover:bg-white hover:text-black transition-all duration-300">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button variant="ghost" asChild className="text-[#8A8A8A] hover:bg-white hover:text-black transition-all duration-300">
            <Link href="/signup">Sign up</Link>
          </Button>
        </div>

        <button
          type="button"
          className="mobile-menu-btn text-white md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {mobileOpen ? (
        <div className="mobile-menu border-t border-[#232323] bg-[#090909] px-6 py-4 md:hidden">
          {navItems.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={scrollTo(item.id)}
              className="block py-3 text-[15px] text-[#8A8A8A] hover:text-white"
            >
              {item.name}
            </a>
          ))}
          <hr className="my-2 border-[#232323]" />
          <Link
            href="/login"
            onClick={() => setMobileOpen(false)}
            className="block py-3 text-[15px] text-[#8A8A8A] hover:text-white"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            onClick={() => setMobileOpen(false)}
            className="mt-2 inline-flex w-full items-center justify-center rounded-full bg-white px-4 py-3 text-sm font-semibold text-black"
          >
            Sign up
          </Link>
        </div>
      ) : null}
    </nav>
  );
}
