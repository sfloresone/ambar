import { buttonVariants } from "@ambar/ui/components/button";
import { FirstMomentDialog } from "@ambar/ui/components/first-moment-dialog";
import { SegmentedControl } from "@ambar/ui/components/segmented-control";
import { CheckIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import type { Plan } from "@ambar/core";
import { attachAmberInteraction } from "@/lib/amber-interaction.ts";

type Billing = "monthly" | "yearly";

const euros = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

type PricingPlansProps = {
  plans: Plan[];
  appUrl: string;
  /** Photo that develops behind the onboarding title. */
  onboardingBackdrop?: string;
  apiUrl?: string;
  /** Server-rendered specimens, enhanced once this island becomes visible. */
  seed?: ReactNode;
  leaf?: ReactNode;
};

export function PricingPlans({ plans, appUrl, onboardingBackdrop, apiUrl, seed, leaf }: PricingPlansProps) {
  const root = useRef<HTMLDivElement>(null);
  const [billing, setBilling] = useState<Billing>("monthly");
  const paid = plans.find((plan) => plan.yearly !== undefined);
  const saving = paid?.yearly === undefined ? 0 : Math.round((1 - paid.yearly / (paid.monthly * 12)) * 100);
  const yearlyLabel = `Yearly · save ${saving}%`;

  useEffect(() => {
    if (root.current) return attachAmberInteraction(root.current);
  }, []);

  return (
    <div ref={root} className="flex flex-col items-start gap-8">
      <SegmentedControl
        label="Billing period"
        options={["Monthly", yearlyLabel]}
        defaultValue="Monthly"
        onValueChange={(value) => setBilling(value === yearlyLabel ? "yearly" : "monthly")}
      />
      <ul className="grid w-full gap-6 sm:grid-cols-2">
        {plans.map((plan) => (
          <li
            key={plan.id}
            className="flex flex-col overflow-hidden rounded-3xl border bg-card shadow-[0_1px_2px_rgb(20_20_20/0.05),0_8px_24px_rgb(20_20_20/0.06)]"
          >
            <div className="px-6 pt-10 pb-8">{plan.id === "seed" ? seed : leaf}</div>
            <div className="flex flex-1 flex-col gap-5 border-t p-6">
              <h3 className="text-2xl">{plan.name}</h3>
              <Price plan={plan} billing={billing} />
              <ul className="flex flex-col gap-2.5 text-sm">
                {[plan.storage, plan.readings, plan.moments].map((line) => (
                  <li key={line} className="flex items-center gap-2.5">
                    <CheckIcon weight="bold" aria-hidden className="size-4 shrink-0 text-leaf" />
                    {line}
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-2">
                {plan.id === "seed" ? (
                  <FirstMomentDialog continueHref={appUrl} backdropSrc={onboardingBackdrop} apiUrl={apiUrl} tone="cloud" size="md" />
                ) : (
                  <a href={`${appUrl}/login`} className={buttonVariants({ tone: "leaf" })}>
                    Get {plan.name}
                  </a>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

type PriceProps = {
  plan: Plan;
  billing: Billing;
};

function Price({ plan, billing }: PriceProps) {
  if (plan.monthly === 0) {
    return (
      <div className="flex flex-col gap-1">
        <p className="flex items-baseline gap-2">
          <span className="font-heading text-4xl font-bold">{euros.format(0)}</span>
          <span className="text-muted-foreground">forever</span>
        </p>
        {/* Same height as the paid plan's billing line, so both placards align. */}
        <p aria-hidden className="min-h-5" />
      </div>
    );
  }

  const yearly = billing === "yearly" && plan.yearly !== undefined;

  return (
    <div aria-live="polite" className="flex flex-col gap-1">
      <p className="flex items-baseline gap-2">
        <span className="font-heading text-4xl font-bold">{euros.format(yearly ? (plan.yearly ?? 0) : plan.monthly)}</span>
        <span className="text-muted-foreground">{yearly ? "a year" : "a month"}</span>
      </p>
      <p className="min-h-5 text-sm text-muted-foreground">
        {yearly && plan.yearly !== undefined ? `${euros.format(plan.yearly / 12)} a month, billed yearly` : ""}
      </p>
    </div>
  );
}
