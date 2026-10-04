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
    slug: "buttons",
    title: "Buttons",
    description: "Variants, sizes, icons and states, plus lab candidates.",
  },
  {
    slug: "team",
    title: "Team",
    description: "Portrait cards, placeholders and accessible social links on both surfaces.",
  },
];
