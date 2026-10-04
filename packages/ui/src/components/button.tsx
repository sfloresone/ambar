import { CircleNotchIcon } from "@phosphor-icons/react";
import type { ComponentProps } from "react";

import { PRESS_ACTIVE, TACTILE_BASE, TONE, type TactileTone } from "../lib/tactile.ts";
import { cn } from "../lib/utils.ts";

export type ButtonTone = TactileTone;

export type ButtonSize = "sm" | "md" | "lg" | "icon-sm" | "icon" | "icon-lg";

const SIZE: Record<ButtonSize, string> = {
  sm: "h-9 gap-1.5 rounded-lg px-3 text-xs [&_svg]:size-3.5",
  md: "h-10 gap-2 rounded-xl px-4 text-sm [&_svg]:size-4",
  lg: "h-12 gap-2 rounded-xl px-5 text-base [&_svg]:size-5",
  "icon-sm": "size-9 rounded-lg [&_svg]:size-4",
  icon: "size-10 rounded-xl [&_svg]:size-4",
  "icon-lg": "size-12 rounded-xl [&_svg]:size-5",
};

type ButtonVariantsOptions = {
  tone?: ButtonTone;
  size?: ButtonSize;
  className?: string;
};

/**
 * Classes of the tactile button, for elements that must look like one (e.g. an `<a>`).
 * tone: ink is the main action, leaf confirms or saves, sky shares, cloud is neutral, danger destroys.
 */
export function buttonVariants({ tone = "ink", size = "md", className }: ButtonVariantsOptions = {}) {
  return cn(TACTILE_BASE, "relative [&_svg]:shrink-0", SIZE[size], TONE[tone], PRESS_ACTIVE, className);
}

type ButtonProps = ComponentProps<"button"> & {
  tone?: ButtonTone;
  size?: ButtonSize;
  /** Keeps the width, shows a spinner, sets aria-busy and ignores clicks. */
  loading?: boolean;
};

export function Button({
  className,
  tone = "ink",
  size = "md",
  loading = false,
  type = "button",
  onClick,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      data-slot="button"
      data-tone={tone}
      aria-busy={loading || undefined}
      aria-disabled={loading || undefined}
      onClick={loading ? (event) => event.preventDefault() : onClick}
      className={buttonVariants({ tone, size, className: cn(loading && "pointer-events-none", className) })}
      {...props}
    >
      <span className={cn("inline-flex items-center gap-[inherit]", loading && "opacity-0")}>{children}</span>
      {loading && <CircleNotchIcon weight="bold" aria-hidden className="absolute animate-spin" />}
    </button>
  );
}
