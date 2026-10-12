// The sign-in / sign-up layout: a media pane (the dither sequence) beside the flow. Used by the landing
// dialog and the app's /login, so both read as the same screen. Sign in keeps the media on the left, sign
// up on the right; switching closes the Shutter over the whole surface, the panes trade places behind it,
// and it opens again. The media pane is decorative and hidden below md, where the flow fills the surface.
import type { ReactNode } from "react";

import { cn } from "../lib/utils.ts";
import { Shutter } from "./shutter.tsx";
import { SignInShowcase } from "./sign-in-showcase.tsx";

type FlowSplitProps = {
  /** Media pane content. Defaults to the saved sign-in photo sequence. */
  showcase?: ReactNode;
  /** Behind the top of the flow pane, bleeding to its edges (e.g. the faint Develop photo). */
  backdrop?: ReactNode;
  /** Which side the media pane is on (md and up). */
  mediaSide?: "left" | "right";
  /** Shutter closed over everything: a mode switch is under way. */
  switching?: boolean;
  children: ReactNode;
  className?: string;
};

export function FlowSplit({ showcase, backdrop, mediaSide = "left", switching = false, children, className }: FlowSplitProps) {
  return (
    <div className={cn("relative grid rounded-[inherit] md:min-h-[min(40rem,calc(100dvh-2rem))] md:grid-cols-2", className)}>
      {/* The flow first in DOM order, so reading and focus follow it before the decorative media. */}
      <div
        className={cn(
          "relative flex flex-col justify-center overflow-hidden p-6 sm:p-10 md:row-start-1",
          mediaSide === "left" ? "md:col-start-2" : "md:col-start-1",
        )}
      >
        {backdrop}
        <div className="relative mx-auto w-full max-w-md">{children}</div>
      </div>
      <div
        aria-hidden
        className={cn(
          "relative hidden overflow-hidden bg-muted md:row-start-1 md:block",
          mediaSide === "left" ? "md:col-start-1" : "md:col-start-2",
        )}
      >
        {showcase ?? <SignInShowcase />}
      </div>
      <Shutter closed={switching} />
    </div>
  );
}
