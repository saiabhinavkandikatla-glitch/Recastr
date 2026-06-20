import {
  Clock,
  Folder,
  FileText,
  Bell
} from "lucide-react";

export function FeatureGrid() {
  const benefits = [
    {
      icon: Clock,
      title: "Save Time",
      description:
        "Reuse existing content instead of creating everything manually."
    },
    {
      icon: Folder,
      title: "Stay Organized",
      description:
        "Keep generated content in one place."
    },
    {
      icon: FileText,
      title: "Multiple Formats",
      description:
        "Generate posts, captions and summaries for different use cases."
    },
    {
      icon: Bell,
      title: "Email Reminders",
      description:
        "Receive notifications when content generation is complete."
    }
  ];

  return (
    <section
      id="outputs"
      className="border-t border-[#232323] py-36"
    >
      <div className="mx-auto max-w-7xl px-6">

        <div className="mb-20 text-center">

          <p className="text-sm uppercase tracking-[0.3em] text-[#8A8A8A]">
            Benefits
          </p>

          <h2 className="mt-6 text-5xl font-bold">
            Repurpose Content Without Starting From Scratch
          </h2>

        </div>

        <div className="grid gap-6 md:grid-cols-2">

          {benefits.map((benefit) => {
            const Icon = benefit.icon;

            return (
              <div
                key={benefit.title}
                className="group flex h-full flex-col rounded-[32px] border border-[#232323] bg-[#000000] p-10 transition-all duration-300 hover:-translate-y-1 hover:scale-[1.01] hover:border-white/30 hover:bg-[#111111] hover:shadow-[0_8px_30px_rgba(255,255,255,0.04)]"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#232323] bg-[#111111] transition-colors group-hover:border-white/50">
                  <Icon className="h-6 w-6 text-white" />
                </div>

                <h3 className="mt-8 text-2xl font-semibold transition-colors group-hover:text-white">
                  {benefit.title}
                </h3>

                <p className="mt-5 flex-1 leading-8 text-[#8A8A8A]">
                  {benefit.description}
                </p>
              </div>
            );
          })}

        </div>
      </div>
    </section>
  );
}
