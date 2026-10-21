import type { MomentKeeper } from "@ambar/core";
import { UserIcon } from "@phosphor-icons/react";
import { useState } from "react";

import { cn } from "../../lib/utils.ts";

/** Authorship, independent of the moment's sharing permissions. */
export function MomentKeeperAvatar({ keeper, className }: { keeper?: MomentKeeper; className?: string }) {
  const [failedUrl, setFailedUrl] = useState<string>();
  const name = keeper?.name ?? "you";
  const initials = name.split(/\s+/).slice(0, 2).map((part) => part.charAt(0)).join("");

  return (
    <span title={`Kept by ${name}`} className={cn("relative grid size-7 shrink-0 place-items-center overflow-hidden rounded-full border border-border/60 bg-sky text-xs font-medium text-ink uppercase ring-3 ring-background", className)}>
      <span className="sr-only">Kept by {name}</span>
      {keeper === undefined ? <UserIcon weight="bold" aria-hidden className="size-4" /> : <span aria-hidden>{initials}</span>}
      {keeper?.avatarUrl !== undefined && keeper.avatarUrl !== failedUrl && (
        <img src={keeper.avatarUrl} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailedUrl(keeper.avatarUrl)} className="absolute inset-0 size-full object-cover" />
      )}
    </span>
  );
}

/** A quiet, presence-style keeper marker for a moment row. */
export function MomentKeeperDock({ keeper, compact = false, className }: { keeper?: MomentKeeper; compact?: boolean; className?: string }) {
  const name = keeper?.name ?? "you";

  return (
    <div
      className={cn(
        "inline-flex max-w-full items-center rounded-full border border-border/80 bg-background/90 p-1 text-foreground shadow-[0_2px_8px_rgb(20_20_20/0.12)] backdrop-blur-md",
        !compact && "gap-1.5 p-1.5 pr-3 shadow-[0_4px_18px_rgb(20_20_20/0.14)]",
        className,
      )}
    >
      <span className="sr-only">Kept by {name}</span>
      <span aria-hidden="true" className={cn("inline-flex min-w-0 items-center", !compact && "gap-1.5")}>
        <MomentKeeperAvatar keeper={keeper} className={cn("ring-0", compact && "border-sky-deep/40", compact ? "size-6" : "size-8")} />
        {!compact && <span className="max-w-24 truncate text-xs font-medium">{name}</span>}
      </span>
    </div>
  );
}
