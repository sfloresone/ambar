// The mark at the top of a sign-in / keep flow: where the iris will close onto when the flow ends.
// Inline SVG (nothing to load) that develops into view. Measure it with irisOriginOf() from iris.tsx.
import { motion, useReducedMotion } from "motion/react";
import type { Ref } from "react";

import { EASE } from "../lib/motion.ts";
import { Mark } from "./mark.tsx";

type FlowLogoProps = {
  ref?: Ref<HTMLDivElement>;
};

export function FlowLogo({ ref }: FlowLogoProps) {
  const reduceMotion = useReducedMotion() === true;

  return (
    <motion.div
      ref={ref}
      data-slot="flow-logo"
      className="mx-auto mb-6 size-12"
      initial={reduceMotion ? false : { opacity: 0, transform: "scale(0.85)", filter: "blur(6px)" }}
      animate={{ opacity: 1, transform: "scale(1)", filter: "blur(0px)" }}
      transition={{ duration: 0.5, ease: EASE.develop }}
    >
      <Mark className="size-full" />
    </motion.div>
  );
}
