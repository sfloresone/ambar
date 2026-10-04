import { DevicesIcon, LockSimpleIcon, SparkleIcon, type Icon } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

const ICONS = {
  sparkle: SparkleIcon,
  devices: DevicesIcon,
  lock: LockSimpleIcon,
} as const satisfies Record<string, Icon>;

export type FeatureCard = {
  icon: keyof typeof ICONS;
  title: string;
  text: string;
};

type FeatureCardsProps = {
  features: FeatureCard[];
};

export function FeatureCards({ features }: FeatureCardsProps) {
  const reduceMotion = useReducedMotion() === true;

  return (
    <ul className="grid gap-4 sm:grid-cols-3">
      {features.map(({ icon, title, text }, index) => {
        const Icon = ICONS[icon];

        return (
          <motion.li
            key={title}
            className="flex flex-col gap-3 rounded-2xl border bg-card p-6"
            initial={reduceMotion ? false : { opacity: 0, transform: "translateY(12px)" }}
            whileInView={{ opacity: 1, transform: "translateY(0px)" }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.3, ease: EASE_OUT, delay: reduceMotion ? 0 : index * 0.05 }}
          >
            <span className="grid size-10 place-items-center rounded-xl bg-sky text-ink">
              <Icon weight="bold" aria-hidden className="size-5" />
            </span>
            <h3 className="text-lg">{title}</h3>
            <p className="text-sm text-pretty text-muted-foreground">{text}</p>
          </motion.li>
        );
      })}
    </ul>
  );
}
