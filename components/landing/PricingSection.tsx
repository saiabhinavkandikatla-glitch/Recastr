import { Button } from "@/components/ui/button";
import Link from "next/link";

export function PricingSection() {
  const plans = [
    {
      name: "Free",
      price: "₹0",
      features: [
        "15 credits included",
        "All output platforms",
        "Email reminder scheduling",
        "Basic exports (PDF, CSV)",
      ]
    },
    {
      name: "Pro",
      price: "₹999",
      featured: true,
      features: [
        "30 projects per month",
        "Podcast ingestion",
        "3 brand voice profiles",
        "Calendar scheduling",
        "Priority queue processing",
      ]
    },
    {
      name: "Team",
      price: "₹2,999",
      features: [
        "Unlimited projects",
        "Unlimited brand voices",
        "Shared team workspace",
        "Client-ready exports",
        "Dedicated priority support",
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
              className={`group flex h-full flex-col rounded-[32px] border p-10 transition-all duration-300 hover:-translate-y-1 hover:scale-[1.01] hover:shadow-[0_8px_30px_rgba(255,255,255,0.04)] ${
                plan.featured
                  ? "border-white bg-[#0A0A0A] hover:bg-[#111111]"
                  : "border-[#232323] bg-[#000000] hover:border-white/30 hover:bg-[#111111]"
              }`}
            >
              <h3 className="text-2xl font-semibold">
                {plan.name}
              </h3>

              <div className="mt-8 text-5xl font-bold">
                {plan.price}
                <span className="text-lg text-[#8A8A8A] font-normal">
                  /month
                </span>
                <p className="mt-1.5 text-xs text-[#52525b] font-medium">Billed monthly</p>
              </div>

              <div className="mt-10 mb-10 space-y-4 flex-1">
                {plan.features.map((feature) => (
                  <div
                    key={feature}
                    className="text-[#8A8A8A] transition-colors group-hover:text-[#A0A0A0]"
                  >
                    {feature}
                  </div>
                ))}
              </div>

              <div className="mt-auto">
                <Button className="w-full" asChild variant={plan.featured ? "default" : "secondary"}>
                  <Link
                    href={
                      plan.name.toLowerCase() === "team"
                        ? "/contact"
                        : `/signup?plan=${plan.name.toLowerCase()}`
                    }
                  >
                    {plan.name.toLowerCase() === "team"
                      ? "Talk to us"
                      : plan.name.toLowerCase() === "free"
                      ? "Start free"
                      : "Start Pro trial"}
                  </Link>
                </Button>
              </div>
            </div>
          ))}

        </div>
      </div>
    </section>
  );
}
