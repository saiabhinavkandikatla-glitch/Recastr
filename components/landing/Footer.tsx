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
            Built for creators who publish consistently.
          </p>
          <div className="flex gap-4 mt-6">
            <a href="https://x.com/recastr" target="_blank" rel="noopener noreferrer" className="text-[#8a8a8a] hover:text-white transition-colors" aria-label="X (Twitter)">
              <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <a href="https://linkedin.com/company/recastr" target="_blank" rel="noopener noreferrer" className="text-[#8a8a8a] hover:text-white transition-colors" aria-label="LinkedIn">
              <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
              </svg>
            </a>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm text-[#8A8A8A]">
          {links.map((link) => (
            <Link key={link.name} href={link.href} className="transition-colors hover:text-white">
              {link.name}
            </Link>
          ))}
        </div>
      </div>

      <div className="mx-auto mt-12 flex max-w-7xl flex-col items-center justify-center border-t border-[#232323] px-6 pt-8 text-sm text-[#52525b]">
        <span>© 2026 Recastr Labs. All rights reserved.</span>
      </div>
    </footer>
  );
}
