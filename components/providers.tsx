"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Suspense, useState } from "react";
import { Toaster } from "sonner";
import { PostHogPageView } from "@/components/analytics/PostHogPageView";
import { PageTransition } from "@/components/layout/PageTransition";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <QueryClientProvider client={queryClient}>
        <Suspense fallback={null}>
          <PostHogPageView />
        </Suspense>
        <PageTransition>{children}</PageTransition>
        <Toaster richColors position="top-right" />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
