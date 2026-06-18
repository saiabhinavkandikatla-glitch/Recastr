"use client";

export function PreviewCard() {
  return (
    <div className="h-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-white">Generated Content</h2>
        <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-500">
          Completed
        </span>
      </div>
      <div className="prose prose-invert max-w-none">
        <p className="text-lg leading-relaxed text-[#D1D1D1]">
          This is a premium preview of the generated content. It features a clean, high-contrast aesthetic.
        </p>
        <p className="text-lg leading-relaxed text-[#D1D1D1]">
          The layout is spacious, avoiding dense clusters of information, allowing the user to focus entirely on the quality of the output.
        </p>
      </div>
    </div>
  );
}
