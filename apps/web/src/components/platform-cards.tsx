import { EASE } from "@ambar/ui/lib/motion";
import {
  DesktopIcon,
  DeviceMobileIcon,
  GlobeIcon,
  PlayIcon,
  PuzzlePieceIcon,
  type Icon,
} from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";


const ICONS = {
  globe: GlobeIcon,
  puzzle: PuzzlePieceIcon,
  mobile: DeviceMobileIcon,
  desktop: DesktopIcon,
} as const satisfies Record<string, Icon>;

export type PlatformCard = {
  icon: keyof typeof ICONS;
  name: string;
  status: "At launch" | "Later";
  text: string;
  /** Path to the demo video. Until it exists, the card shows a placeholder. */
  video?: string;
};

type PlatformCardsProps = {
  platforms: PlatformCard[];
};

export function PlatformCards({ platforms }: PlatformCardsProps) {
  const reduceMotion = useReducedMotion() === true;

  return (
    <ul className="grid gap-6 sm:grid-cols-2">
      {platforms.map(({ icon, name, status, text, video }, index) => {
        const Icon = ICONS[icon];

        return (
          <motion.li
            key={name}
            className="flex flex-col overflow-hidden rounded-3xl border bg-card shadow-[0_1px_2px_rgb(20_20_20/0.05),0_8px_24px_rgb(20_20_20/0.06)]"
            initial={reduceMotion ? false : { opacity: 0, transform: "translateY(12px)" }}
            whileInView={{ opacity: 1, transform: "translateY(0px)" }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.3, ease: EASE.outSoft, delay: reduceMotion ? 0 : index * 0.05 }}
          >
            {video ? (
              <video src={video} muted loop playsInline preload="none" className="aspect-video w-full bg-muted object-cover" />
            ) : (
              <div className="grid aspect-video place-items-center bg-muted">
                <span className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
                  <PlayIcon weight="fill" aria-hidden className="size-8" />
                  {name} video
                </span>
              </div>
            )}
            <div className="flex flex-col gap-2 border-t p-6">
              <div className="flex items-center justify-between gap-4">
                <h3 className="flex items-center gap-2 text-xl">
                  <Icon weight="bold" aria-hidden className="size-5" />
                  {name}
                </h3>
                <span
                  className={
                    status === "At launch"
                      ? "shrink-0 rounded-full bg-leaf px-2.5 py-1 text-xs font-medium text-cloud"
                      : "shrink-0 rounded-full bg-sky px-2.5 py-1 text-xs font-medium text-ink"
                  }
                >
                  {status}
                </span>
              </div>
              <p className="max-w-md text-pretty text-muted-foreground">{text}</p>
            </div>
          </motion.li>
        );
      })}
    </ul>
  );
}
