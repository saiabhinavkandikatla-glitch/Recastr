"use client";

import { Check } from "lucide-react";
import { PLAN_RULES } from "@/lib/plans";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RazorpayButton } from "@/components/billing/RazorpayButton";

export function PricingModal() {
  return (
    <div className="space-y-6">
      <p className="text-center text-sm text-muted-foreground">
        1 credit = 1 full content generation across all selected platforms.
      </p>
      <div className="grid gap-3 md:grid-cols-3">
        {(["FREE", "PRO", "AGENCY"] as const).map((plan) => {
          const rule = PLAN_RULES[plan];
          return (
            <Card key={plan} className={plan === "PRO" ? "border-2 border-primary" : ""}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{rule.label}</CardTitle>
                  {plan === "PRO" ? <Badge>Most popular</Badge> : null}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-2xl font-medium">
                  ₹{plan === "FREE" ? 0 : plan === "PRO" ? 2400 : 8200}
                  <span className="text-sm font-normal text-muted-foreground">/month</span>
                </p>
              {rule.features.slice(0, 4).map((feature) => (
                <p key={feature} className="flex gap-2 text-sm text-muted-foreground">
                  <Check className="mt-0.5 h-4 w-4 text-primary" />
                  {feature}
                </p>
              ))}
              {plan !== "FREE" ? <RazorpayButton plan={plan} interval="monthly" /> : null}
            </CardContent>
          </Card>
        );
      })}
      </div>
    </div>
  );
}
