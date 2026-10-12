// Adapted from Opensource UI "Apple Browser" (MIT, Copyright (c) 2026 Bidyut Kundu).
// Source: https://opensourceui.in/components/browser
// Full license: packages/ui/LICENSES/opensourceui.txt.
import { cn } from "@ambar/ui/lib/utils";
import type { ReactNode } from "react";

type BrowserMockupProps = {
  children: ReactNode;
  url: string;
  className?: string;
};

export function BrowserMockup({
  children,
  url,
  className,
}: BrowserMockupProps) {
  return (
    <div
      data-slot="browser-mockup"
      className={cn(
        "@container w-full min-w-0 overflow-hidden rounded-[3%/4%] border border-ink/15 bg-cloud font-sans text-ink shadow-[0_24px_70px_-30px_var(--color-ink)]",
        className,
      )}
    >
      <div className="flex h-[8cqw] items-center gap-[3%] border-b border-ink/10 bg-linear-to-b from-cloud to-ink/5 px-[3%]">
        <div aria-hidden className="flex shrink-0 gap-[1cqw]">
          <span className="size-[1.5cqw] rounded-full bg-ink/30" />
          <span className="size-[1.5cqw] rounded-full bg-ink/20" />
          <span className="size-[1.5cqw] rounded-full bg-ink/10" />
        </div>
        <div className="mx-auto flex h-[4.8cqw] w-[72%] min-w-0 items-center justify-center rounded-[1cqw] bg-cloud px-[2%] ring-1 ring-ink/5">
          <span className="truncate text-[clamp(0.4375rem,1.8cqw,0.625rem)] text-ink/65">
            {url}
          </span>
        </div>
        <span aria-hidden className="w-[7%] shrink-0" />
      </div>
      <div className="relative aspect-[3/2] w-full overflow-hidden bg-cloud">
        {children}
      </div>
    </div>
  );
}
