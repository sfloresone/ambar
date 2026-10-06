/** Plans: one source for the landing pricing and the app settings. Rename plans or change limits here only. */

export type PlanId = "seed" | "leaf";

export type Plan = {
  id: PlanId;
  name: string;
  /** Price in euros. The free plan has no yearly price. */
  monthly: number;
  yearly?: number;
  storage: string;
  readings: string;
  moments: string;
};

export const plans: Plan[] = [
  {
    id: "seed",
    name: "Seed",
    monthly: 0,
    storage: "2 GB of storage",
    readings: "75 readings a month",
    moments: "Up to 2,000 moments",
  },
  {
    id: "leaf",
    name: "Leaf",
    monthly: 5,
    yearly: 48,
    storage: "25 GB of storage",
    readings: "500 readings a month",
    moments: "Unlimited moments",
  },
];
