// Adapted from Opensource UI "Apple iPhone" (MIT, Copyright (c) 2026 Bidyut Kundu).
// Source: https://opensourceui.in/components/phone
// Full license: packages/ui/LICENSES/opensourceui.txt.
import { cn } from "@ambar/ui/lib/utils";
import type { ReactNode } from "react";

type PhoneMockupProps = {
  children: ReactNode;
  className?: string;
};

export function PhoneMockup({ children, className }: PhoneMockupProps) {
  return (
    <div
      data-slot="phone-mockup"
      className={cn(
        "relative aspect-[70.6/146.6] w-full bg-cloud bg-linear-to-br from-cloud via-ink/25 to-cloud shadow-[0_18px_40px_-24px_var(--color-ink)] ring-1 ring-ink/20 [border-radius:16%/7.7%]",
        className,
      )}
    >
      <div
        aria-hidden
        className="absolute top-[15.5%] -left-[0.8%] h-[3.2%] w-[0.8%] rounded-l-sm bg-ink/40"
      />
      <div
        aria-hidden
        className="absolute top-[21%] -left-[0.8%] h-[7.2%] w-[0.8%] rounded-l-sm bg-ink/40"
      />
      <div
        aria-hidden
        className="absolute top-[30.5%] -left-[0.8%] h-[7.2%] w-[0.8%] rounded-l-sm bg-ink/40"
      />
      <div
        aria-hidden
        className="absolute top-[23%] -right-[0.8%] h-[11.5%] w-[0.8%] rounded-r-sm bg-ink/40"
      />
      <div className="absolute inset-x-[0.8%] inset-y-[0.4%] bg-ink [border-radius:15.5%/7.45%]">
        <div className="absolute inset-x-[1.4%] inset-y-[0.7%] overflow-hidden bg-cloud [border-radius:14.4%/6.9%]">
          <div className="relative size-full">{children}</div>
          <div
            aria-hidden
            className="pointer-events-none absolute top-[2.1%] left-1/2 z-20 h-[3.8%] w-[26%] -translate-x-1/2 rounded-full bg-ink"
          >
            <div className="absolute top-1/4 right-[8%] h-1/2 w-[12%] rounded-full bg-sky/20" />
          </div>
          <div
            aria-hidden
            className="pointer-events-none absolute bottom-[1.1%] left-1/2 z-20 h-[0.6%] w-[32%] -translate-x-1/2 rounded-full bg-ink/20"
          />
        </div>
      </div>
    </div>
  );
}
