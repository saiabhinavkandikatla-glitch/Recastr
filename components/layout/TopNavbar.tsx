"use client";

import { SearchBar } from "./SearchBar";
import { UserMenu } from "./UserMenu";
import { Breadcrumbs } from "./Breadcrumbs";

export function TopNavbar() {
  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-4 border-b border-[#232323] bg-[#090909]/80 px-4 md:px-6 lg:px-8 backdrop-blur-md">
      <div className="flex flex-1 items-center gap-4">
        <Breadcrumbs />
      </div>
      <div className="flex items-center gap-4">
        <UserMenu />
      </div>
    </header>
  );
}
