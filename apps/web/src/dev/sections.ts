export type DevSection = {
  slug: string;
  title: string;
  description: string;
};

/** Gallery sections. Each slug maps to src/dev/pages/<slug>.astro. */
export const devSections: DevSection[] = [
  {
    slug: "colors",
    title: "Colors",
    description: "Brand palette, roles, contrast and how photos sit on each surface.",
  },
  {
    slug: "logo",
    title: "Logo",
    description: "The amber mark, and the wordmark with the leaf as the accent, on cloud and on ink.",
  },
  {
    slug: "buttons",
    title: "Buttons",
    description: "Variants, sizes, icons and states, plus lab candidates.",
  },
  {
    slug: "team",
    title: "Team",
    description: "Portrait cards, placeholders and accessible social links on both surfaces.",
  },
  {
    slug: "motion",
    title: "Motion",
    description: "Develop, Shutter and interactive amber, replayable.",
  },
  {
    slug: "sign-in",
    title: "Sign-in flow",
    description: "Keep flow: drop, email, 6-digit code or link, keeping, kept. Mock clients.",
  },
];
