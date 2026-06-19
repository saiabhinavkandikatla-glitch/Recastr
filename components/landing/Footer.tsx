import Link from "next/link";
import { Logo } from "@/components/Logo";

export function Footer() {
  const links = [
    { name: "Workflow", href: "/#workflow" },
    { name: "Outputs", href: "/#outputs" },
    { name: "Pricing", href: "/#pricing" },
    { name: "Docs", href: "/docs" },
    { name: "Privacy", href: "/privacy" },
    { name: "Terms", href: "/terms" },
    { name: "Contact", href: "/contact" },
  ];

  return (
    <footer className="border-t border-[#232323] bg-[#090909] py-16">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-10 px-6 md:flex-row">
        <div>
          <Logo size="md" className="text-white" />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-[#8A8A8A]">
            Turn one source into 30 days of content.
            <br />
            Made for creators who&apos;d rather make than schedule.
          </p>
        </div>

        <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm text-[#8A8A8A]">
          {links.map((link) => (
            <Link key={link.name} href={link.href} className="transition-colors hover:text-white">
              {link.name}
            </Link>
          ))}
        </div>
      </div>

      <div className="mx-auto mt-12 flex max-w-7xl flex-col items-center justify-between gap-3 border-t border-[#232323] px-6 pt-8 text-sm text-[#52525b] md:flex-row">
        <span>© 2026 Recastr Labs. All rights reserved.</span>
        <span className="italic">Crafted with coffee and small batches.</span>
      </div>
    </footer>
  );
}
