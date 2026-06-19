"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MagneticWrapper } from "./MagneticWrapper";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [activeItem, setActiveItem] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleScrollTo = (id: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const navItems = [
    { name: "Features", id: "features" },
    { name: "Pricing", id: "pricing" },
  ];

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-500 ${
        scrolled
          ? "border-b border-[#232323]/50 bg-[#090909]/80 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
        <MagneticWrapper>
          <Link
            href="/"
            className="text-xl font-semibold tracking-tight text-white transition-opacity hover:opacity-80"
          >
            Recastr
          </Link>
        </MagneticWrapper>

        <nav className="hidden items-center gap-10 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.id}
              href={`#${item.id}`}
              onClick={handleScrollTo(item.id)}
              onMouseEnter={() => setActiveItem(item.id)}
              onMouseLeave={() => setActiveItem(null)}
              className="relative text-sm text-[#8A8A8A] transition-colors hover:text-white"
            >
              {item.name}
              {activeItem === item.id && (
                <motion.div
                  layoutId="navbar-indicator"
                  className="absolute -bottom-1 left-0 right-0 h-[2px] bg-white"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                />
              )}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <MagneticWrapper>
            <Button variant="ghost" asChild>
              <Link href="/login">Login</Link>
            </Button>
          </MagneticWrapper>

          <MagneticWrapper>
            <Button asChild>
              <Link href="/signup">Start Free</Link>
            </Button>
          </MagneticWrapper>
        </div>
      </div>
    </header>
  );
}
