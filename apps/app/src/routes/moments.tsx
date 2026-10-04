import type { Moment } from "@ambar/core";
import { Button } from "@ambar/ui/components/button";
import { PlusIcon } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";

const moments: Moment[] = [];

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

export function MomentsRoute() {
  const reduceMotion = useReducedMotion() === true;

  if (moments.length === 0) {
    return (
      <motion.section
        className="m-auto flex max-w-sm flex-col items-center gap-4 px-6 text-center"
        initial={reduceMotion ? false : { opacity: 0, transform: "translateY(12px)" }}
        animate={{ opacity: 1, transform: "translateY(0px)" }}
        transition={{ duration: 0.4, ease: EASE_OUT }}
      >
        <motion.div
          className="size-12 rounded-full bg-sky ring-8 ring-sky/25"
          initial={reduceMotion ? false : { opacity: 0, transform: "scale(0.96)" }}
          animate={{ opacity: 1, transform: "scale(1)" }}
          transition={{ duration: 0.4, ease: EASE_OUT }}
        />
        <h1 className="text-2xl tracking-tight">Nothing kept yet</h1>
        <p className="text-muted-foreground">
          A photo, a short clip or a link. Keep it now and it will still be there when you look.
        </p>
        <Button size="lg">
          <PlusIcon weight="bold" />
          Keep a moment
        </Button>
      </motion.section>
    );
  }

  return (
    <ul className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
      {moments.map((moment) => (
        <li key={moment.id} className="rounded-xl border bg-card p-4">
          {moment.kind}
        </li>
      ))}
    </ul>
  );
}
