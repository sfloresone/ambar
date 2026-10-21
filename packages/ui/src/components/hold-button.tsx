// Press and hold to confirm a destructive action. Adapted from opensourceui "Hold to Delete" (MIT).
import { cn } from "../lib/utils.ts";
import { CheckIcon, TrashIcon } from "@phosphor-icons/react";
import { useEffect, useId, useRef, useState, type ComponentProps, type KeyboardEvent } from "react";

import { RAISED_LIGHT } from "../lib/tactile.ts";

type HoldButtonProps = Omit<ComponentProps<"button">, "children"> & {
  label?: string;
  doneLabel?: string;
  /** Read by screen readers so the hold gesture is discoverable. */
  hint?: string;
  onHoldComplete?: () => void;
};

// Fixed duration so Tailwind can compile the class statically.
const HOLD_MS = 1100;

export function HoldButton({
  className,
  label = "Hold to delete",
  doneLabel = "Deleted",
  hint = "Press and hold to confirm",
  onHoldComplete,
  ...props
}: HoldButtonProps) {
  const [holding, setHolding] = useState(false);
  const [done, setDone] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hintId = useId();

  useEffect(() => {
    return () => {
      if (timer.current !== null) {
        clearTimeout(timer.current);
      }
    };
  }, []);

  function start() {
    if (done || timer.current !== null) {
      return;
    }

    setHolding(true);
    timer.current = setTimeout(() => {
      timer.current = null;
      setHolding(false);
      setDone(true);
      onHoldComplete?.();
    }, HOLD_MS);
  }

  function cancel() {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }

    setHolding(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.repeat) {
      return;
    }

    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      start();
    }
  }

  function handleKeyUp(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === " " || event.key === "Enter") {
      cancel();
    }
  }

  const active = holding || done;

  // The fill slides in while its label slides the opposite way, so the label looks clipped by the edge.
  const wipe = cn(
    "transition-transform motion-reduce:transform-none motion-reduce:transition-none",
    active ? "duration-[1100ms] ease-linear" : "duration-300 ease-out",
  );

  return (
    <button
      type="button"
      data-slot="hold-button"
      data-holding={holding || undefined}
      data-done={done || undefined}
      aria-label={done ? doneLabel : label}
      aria-describedby={done ? undefined : hintId}
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      onContextMenu={(event) => event.preventDefault()}
      // aria-disabled instead of disabled: a disabled button drops keyboard focus.
      aria-disabled={done || undefined}
      className={cn(
        "relative flex h-10 w-48 touch-none items-center justify-center overflow-hidden rounded-xl bg-cloud text-sm font-medium outline-hidden select-none dark:bg-secondary dark:text-foreground",
        RAISED_LIGHT,
        "focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-ring",
        !done && "cursor-pointer",
        className,
      )}
      {...props}
    >
      <span className="flex items-center gap-2 text-destructive">
        <TrashIcon weight="bold" aria-hidden />
        {label}
      </span>

      <span
        aria-hidden
        className={cn("absolute inset-0 overflow-hidden bg-destructive", wipe, active ? "translate-x-0" : "-translate-x-full")}
      >
        <span
          className={cn(
            "absolute inset-0 flex items-center justify-center gap-2 text-cloud",
            wipe,
            active ? "translate-x-0" : "translate-x-full",
            done && "opacity-0",
          )}
        >
          <TrashIcon weight="bold" aria-hidden />
          {label}
        </span>
        <span
          className={cn(
            "absolute inset-0 flex items-center justify-center gap-2 text-cloud transition-opacity duration-500 motion-reduce:transition-none",
            done ? "opacity-100 delay-300" : "opacity-0",
          )}
        >
          <CheckIcon weight="bold" aria-hidden />
          {doneLabel}
        </span>
      </span>

      <span id={hintId} className="sr-only">
        {hint}
      </span>
      <span className="sr-only" aria-live="polite">
        {done ? doneLabel : ""}
      </span>
    </button>
  );
}
