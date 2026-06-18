"use client";

const prompts = [
  "Summarize into bullet points",
  "Extract key quotes",
  "Write a viral hook",
];

export function SuggestedPrompts() {
  return (
    <div className="flex flex-wrap gap-2">
      {prompts.map((prompt) => (
        <button
          key={prompt}
          className="rounded-full border border-[#232323] bg-[#090909] px-3 py-1.5 text-xs text-[#8A8A8A] transition-colors hover:border-[#8A8A8A] hover:text-white"
        >
          {prompt}
        </button>
      ))}
    </div>
  );
}
