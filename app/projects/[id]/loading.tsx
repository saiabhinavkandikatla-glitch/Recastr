export default function ProjectLoading() {
  return (
    <div className="space-y-5 p-6 animate-pulse">
      <div className="flex items-center gap-3 border-b pb-4">
        <div className="h-9 w-24 rounded-lg bg-muted" />
        <div className="h-8 w-56 rounded-lg bg-muted" />
        <div className="ml-auto hidden gap-2 md:flex">
          <div className="h-9 w-20 rounded-full bg-muted" />
          <div className="h-9 w-24 rounded-full bg-muted" />
          <div className="h-9 w-28 rounded-lg bg-muted" />
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
        <div className="space-y-3">
          <div className="h-10 rounded-xl bg-muted" />
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-[var(--card-radius)] border p-4">
              <div className="h-4 w-24 rounded-full bg-muted" />
              <div className="mt-3 h-4 w-full rounded bg-muted" />
              <div className="mt-2 h-4 w-3/4 rounded bg-muted" />
              <div className="mt-4 h-1 w-full rounded-full bg-muted" />
            </div>
          ))}
        </div>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="rounded-[var(--card-radius)] border p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-muted" />
                <div className="h-3 w-20 rounded bg-muted" />
                <div className="ml-auto h-3 w-12 rounded-full bg-muted" />
              </div>
              <div className="space-y-2">
                <div className="h-3 w-full rounded bg-muted" />
                <div className="h-3 w-4/5 rounded bg-muted" />
                <div className="h-3 w-3/5 rounded bg-muted" />
              </div>
              <div className="flex gap-2 border-t pt-3">
                <div className="h-7 w-24 rounded bg-muted" />
                <div className="h-7 w-20 rounded bg-muted" />
                <div className="h-7 w-16 rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
