// Leaving for Google or GitHub, in the Iris' language: the iris closes onto the logo of the pressed
// button and carries it to the center; shut, the Ambar mark develops beside it, three dots pulse between
// them and "Connecting to Google…" appears. Then the browser goes to the provider, which keeps this frame
// on screen while its page loads. Coming back, the app opens the iris as on every arrival.
// Portable: the caller passes where to go; the only platform call is the navigation itself.
import type { Provider } from "@ambar/core";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { DEVELOP_FROM, DEVELOP_TO, EASE } from "../lib/motion.ts";
import { wait } from "../lib/wait.ts";
import { Iris, irisOriginOf, type IrisOrigin } from "./iris.tsx";
import { Mark } from "./mark.tsx";
import { PROVIDER_NAME, ProviderChip } from "./provider-logo.tsx";

/** Shut, the connecting frame shows this long before navigating, so it reads before the page unloads. */
const SHOW_MS = 300;

/**
 * The connecting row: Ambar (96) · gap 24 · dots (48) · gap 24 · chip (96) = 288 px. When the iris shuts the
 * chip is at the viewport center; the row starts shifted so its chip sits exactly there (half the row
 * minus half the chip: 96 px), then settles centered.
 */
const CHIP_OFFSET_PX = 96;

const DOTS = ["bg-leaf delay-0", "bg-sky delay-150", "bg-cloud delay-300"];

type Handoff = {
  provider: Provider;
  origin: IrisOrigin;
  href: string;
  shut: boolean;
};

type ProviderHandoff = {
  /** Plays the handoff from logo (the pressed button's logo) and then navigates to href. */
  start: (provider: Provider, logo: HTMLElement | null, href: string) => void;
  /** Which provider is being connected to, e.g. for the button's busy state. */
  leaving: Provider | null;
  overlay: ReactNode;
};

export function useProviderHandoff(navigate: (href: string) => void = (href) => window.location.assign(href)): ProviderHandoff {
  const reduceMotion = useReducedMotion() === true;
  const [handoff, setHandoff] = useState<Handoff | null>(null);

  // Back from the provider through the back button (page restored from the bfcache): show the form again.
  useEffect(() => {
    function restored(event: PageTransitionEvent) {
      if (event.persisted) {
        setHandoff(null);
      }
    }

    window.addEventListener("pageshow", restored);

    return () => window.removeEventListener("pageshow", restored);
  }, []);

  async function shut(current: Handoff) {
    setHandoff({ ...current, shut: true });
    await wait(SHOW_MS);
    navigate(current.href);
  }

  return {
    start(provider, logo, href) {
      const next = { provider, origin: irisOriginOf(logo), href, shut: false };

      setHandoff(next);

      if (reduceMotion) {
        navigate(href);
      }
    },
    leaving: handoff?.provider ?? null,
    overlay:
      handoff === null || reduceMotion ? null : (
        <>
          <Iris state="closing" origin={handoff.origin} mark={<ProviderChip provider={handoff.provider} />} onDone={() => void shut(handoff)} />
          {handoff.shut && <Connecting provider={handoff.provider} />}
        </>
      ),
  };
}

function Connecting({ provider }: { provider: Provider }) {
  return createPortal(
    // Over the shut iris (same ink, same chip position), so the swap is invisible.
    <div aria-hidden className="fixed inset-0 z-101 flex flex-col items-center justify-center gap-8 bg-ink text-cloud">
      <motion.div
        className="flex items-center gap-6"
        initial={{ transform: `translateX(-${CHIP_OFFSET_PX}px)` }}
        animate={{ transform: "translateX(0px)" }}
        transition={{ duration: 0.45, ease: EASE.develop }}
      >
        <motion.div
          className="size-24 p-3"
          initial={{ opacity: 0, filter: DEVELOP_FROM }}
          animate={{ opacity: 1, filter: DEVELOP_TO }}
          transition={{ duration: 0.6, ease: EASE.develop }}
        >
          <Mark className="size-full" />
        </motion.div>
        <div className="flex w-12 justify-between">
          {DOTS.map((dot) => (
            <span key={dot} className={`size-2 animate-pulse rounded-full ${dot}`} />
          ))}
        </div>
        <div className="size-24">
          <ProviderChip provider={provider} />
        </div>
      </motion.div>
      <motion.p
        className="text-sm text-cloud/80"
        initial={{ opacity: 0, transform: "translateY(6px)" }}
        animate={{ opacity: 1, transform: "translateY(0px)" }}
        transition={{ duration: 0.4, ease: EASE.develop, delay: 0.15 }}
      >
        Connecting to {PROVIDER_NAME[provider]}…
      </motion.p>
    </div>,
    document.body,
  );
}
