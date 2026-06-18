"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Breadcrumbs() {
  const pathname = usePathname();
  const paths = pathname.split("/").filter(Boolean);

  if (paths.length === 0) return null;

  return (
    <nav className="flex items-center text-sm font-medium text-[#8A8A8A]">
      <Link href="/dashboard" className="hover:text-white transition-colors">
        ReCastr
      </Link>
      {paths.map((path, index) => {
        const isLast = index === paths.length - 1;
        const href = `/${paths.slice(0, index + 1).join("/")}`;

        return (
          <div key={path} className="flex items-center">
            <ChevronRight className="mx-2 h-4 w-4" />
            {isLast ? (
              <span className="text-white capitalize">{path}</span>
            ) : (
              <Link href={href} className="hover:text-white transition-colors capitalize">
                {path}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
