"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error(error);

  return (
    <main className="grid min-h-screen place-items-center bg-background p-6 text-foreground">
      <div className="max-w-md rounded-[28px] border bg-card p-6 text-center shadow-soft">
        <p className="text-sm text-muted-foreground">Something went sideways</p>
        <h1 className="mt-3 text-2xl font-medium tracking-normal">Recastr could not load this view.</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">Try again. If it keeps happening, switch demo mode on and continue the pitch flow.</p>
        <div className="mt-4 p-4 bg-red-500/10 text-red-500 rounded-lg text-xs text-left overflow-auto">
          {error.message}
          {error.stack && <pre className="mt-2 text-[10px]">{error.stack}</pre>}
        </div>
        <Button className="mt-5" onClick={reset}>Try again</Button>
      </div>
    </main>
  );
}
