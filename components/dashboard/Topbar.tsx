"use client";

import { UserButton } from "@clerk/nextjs";
import { Bell, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function Topbar() {
  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-[#232323] bg-[#090909] px-6">
      <div className="flex flex-1 items-center gap-4">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[#8A8A8A]" />
          <Input
            type="search"
            placeholder="Search projects, content, or settings..."
            className="w-full bg-[#151515] border-[#232323] pl-9 text-white placeholder:text-[#8A8A8A] focus-visible:ring-1 focus-visible:ring-white/20"
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button className="relative rounded-full p-2 text-[#8A8A8A] hover:bg-[#151515] hover:text-white transition-colors">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-blue-600 ring-2 ring-[#090909]"></span>
        </button>
        <UserButton 
          afterSignOutUrl="/" 
          appearance={{
            elements: {
              userButtonAvatarBox: "h-8 w-8 rounded-full border border-[#232323]"
            }
          }}
        />
      </div>
    </header>
  );
}
