export function WorkflowSection() {
  const steps = [
    {
      number: "01",
      title: "Upload Content",
      description:
        "Upload podcasts, YouTube videos, blogs or long-form content."
    },
    {
      number: "02",
      title: "AI Finds Viral Hooks",
      description:
        "Extract the most engaging ideas and moments automatically."
    },
    {
      number: "03",
      title: "Generate Posts",
      description:
        "Create LinkedIn posts, X threads, captions and scripts."
    },
    {
      number: "04",
      title: "Approve & Export",
      description:
        "Review, edit and export your content everywhere."
    }
  ];

  return (
    <section id="demo" className="border-t border-[#232323] py-36">
      <div className="mx-auto max-w-7xl px-6">

        <div className="mb-20 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-[#8A8A8A]">
            Workflow
          </p>

          <h2 className="mt-6 text-5xl font-bold">
            From One Video To 30 Content Assets
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2">

          {steps.map((step) => (
            <div
              key={step.number}
              className="rounded-[32px] border border-[#232323] bg-[#151515] p-10"
            >
              <p className="text-sm text-[#8A8A8A]">
                {step.number}
              </p>

              <h3 className="mt-5 text-3xl font-semibold text-white">
                {step.title}
              </h3>

              <p className="mt-5 leading-8 text-[#8A8A8A]">
                {step.description}
              </p>
            </div>
          ))}

        </div>
      </div>
    </section>
  );
}
