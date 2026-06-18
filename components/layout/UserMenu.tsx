"use client";

import Link from "next/link";
import { User } from "lucide-react";
import { motion } from "framer-motion";

export function UserMenu() {
  return (
    <div className="flex items-center gap-4">
      <Link href="/settings" passHref legacyBehavior>
        <motion.a
          aria-label="Profile Settings"
          whileHover={{ scale: 1.12, rotate: 4 }}
          whileTap={{ scale: 0.92 }}
          transition={{ type: "spring", stiffness: 450, damping: 15 }}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-[#232323] bg-[#151515] text-[#8A8A8A] hover:text-white transition-colors cursor-pointer"
        >
          <User className="h-5 w-5" />
        </motion.a>
      </Link>
    </div>
  );
}
