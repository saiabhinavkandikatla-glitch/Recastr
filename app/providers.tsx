"use client";

import { QueryProvider } from "@/providers/query-provider";
import { ThemeProvider } from "next-themes";
import { Suspense } from "react";
import { Toaster } from "sonner";
import { PostHogPageView } from "@/components/analytics/PostHogPageView";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <QueryProvider>
        <Suspense fallback={null}>
          <PostHogPageView />
        </Suspense>
        {children}
        <Toaster richColors position="top-right" />
      </QueryProvider>
    </ThemeProvider>
  );
}
