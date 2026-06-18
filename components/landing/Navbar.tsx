"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-[#232323]/50 bg-[#090909]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
        <Link
          href="/"
          className="text-xl font-semibold tracking-tight text-white"
        >
          Recastr
        </Link>

        <nav className="hidden items-center gap-10 md:flex">
          <Link
            href="#features"
            className="text-sm text-[#8A8A8A] transition hover:text-white"
          >
            Features
          </Link>

          <Link
            href="#pricing"
            className="text-sm text-[#8A8A8A] transition hover:text-white"
          >
            Pricing
          </Link>

          <Link
            href="/docs"
            className="text-sm text-[#8A8A8A] transition hover:text-white"
          >
            Docs
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Button variant="ghost" asChild>
            <Link href="/login">Login</Link>
          </Button>

          <Button asChild>
            <Link href="/signup">Start Free</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
