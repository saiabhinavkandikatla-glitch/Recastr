import { Button } from "@/components/ui/button";
import Link from "next/link";

export function PricingSection() {
  const plans = [
    {
      name: "Free",
      price: "$0",
      features: [
        "5 projects",
        "Basic AI generation",
        "Export posts"
      ]
    },
    {
      name: "Pro",
      price: "$19",
      featured: true,
      features: [
        "Unlimited projects",
        "All platforms",
        "Scheduling",
        "Advanced AI"
      ]
    },
    {
      name: "Business",
      price: "$49",
      features: [
        "Teams",
        "Analytics",
        "Priority support"
      ]
    }
  ];

  return (
    <section
      id="pricing"
      className="border-t border-[#232323] py-36"
    >
      <div className="mx-auto max-w-7xl px-6">

        <div className="mb-20 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-[#8A8A8A]">
            Pricing
          </p>

          <h2 className="mt-6 text-5xl font-bold">
            Simple Pricing
          </h2>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">

          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-[32px] border p-10 ${
                plan.featured
                  ? "border-white bg-[#151515]"
                  : "border-[#232323] bg-[#111111]"
              }`}
            >
              <h3 className="text-2xl font-semibold">
                {plan.name}
              </h3>

              <div className="mt-8 text-5xl font-bold">
                {plan.price}
                <span className="text-lg text-[#8A8A8A]">
                  /month
                </span>
              </div>

              <div className="mt-10 space-y-4">

                {plan.features.map((feature) => (
                  <div
                    key={feature}
                    className="text-[#8A8A8A]"
                  >
                    {feature}
                  </div>
                ))}

              </div>

              <Button className="mt-10 w-full" asChild>
                <Link href="/signup">Start Now</Link>
              </Button>

            </div>
          ))}

        </div>
      </div>
    </section>
  );
}
