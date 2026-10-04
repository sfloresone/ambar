/** Pricing source of truth for the landing. Rename plans or change limits here only. */

export type PlanId = "free" | "plus";

export type Plan = {
  id: PlanId;
  /** Catalog number shown on the museum placard. */
  number: string;
  name: string;
  /** Price in euros. Free has no yearly price. */
  monthly: number;
  yearly?: number;
  storage: string;
  readings: string;
  moments: string;
};

export const plans: Plan[] = [
  {
    id: "free",
    number: "No. 01",
    name: "Free",
    monthly: 0,
    storage: "2 GB of storage",
    readings: "75 readings a month",
    moments: "Up to 2,000 moments",
  },
  {
    id: "plus",
    number: "No. 02",
    name: "Plus",
    monthly: 5,
    yearly: 48,
    storage: "25 GB of storage",
    readings: "500 readings a month",
    moments: "Unlimited moments",
  },
];
