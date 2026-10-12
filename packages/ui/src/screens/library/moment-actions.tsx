// Quick actions on a moment: copy, download (or open, for links), and more. Used on cards and in the
// answer panel. Every action reports back with a toast, so it's clear what happened.
import { momentLabel, type Moment } from "@ambar/core";
import { ArrowSquareOutIcon, CopyIcon, DotsThreeIcon, DownloadSimpleIcon, ShareNetworkIcon, TrashIcon } from "@phosphor-icons/react";

import { MenuContent, MenuItem, MenuRoot, MenuSeparator, MenuTrigger } from "../../components/menu.tsx";
import { useToast } from "../../components/toaster.tsx";
import { usePlatformActions } from "../../lib/platform-actions.ts";
import { cn } from "../../lib/utils.ts";
import { useLibrary } from "./library-context.tsx";

export function useMomentActions(moment: Moment) {
  const platform = usePlatformActions();
  const library = useLibrary();
  const toast = useToast();

  return {
    copy() {
      platform.copy(moment).then(
        (copied) => toast.add({ title: copied === "image" ? "Image copied" : "Link copied", description: "Paste it anywhere." }),
        () => toast.add({ title: "Couldn't copy", description: "Your browser blocked the clipboard. Try again." }),
      );
    },
    download: moment.kind === "link" ? undefined : () => platform.download(moment),
    open: () => platform.open(moment),
    share: platform.share === undefined ? undefined : () => void platform.share?.(moment),
    /** Reversible: the toast offers Undo, and the Trash keeps it for TRASH_DAYS. */
    trash() {
      void library.moveToTrash(moment);
    },
  };
}

const ICON_BUTTON =
  "grid size-9 place-items-center rounded-full bg-cloud/90 text-ink shadow-[0_1px_2px_rgb(20_20_20/0.12)] outline-hidden backdrop-blur transition-colors hover:bg-cloud focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-ring [&_svg]:size-4";

type QuickActionsProps = {
  moment: Moment;
  className?: string;
};

/** Floating icon buttons for a card. */
export function QuickActions({ moment, className }: QuickActionsProps) {
  const actions = useMomentActions(moment);
  const label = momentLabel(moment);

  return (
    <div className={cn("flex gap-1.5", className)}>
      <button type="button" className={cn(ICON_BUTTON, "pointer-coarse:hidden")} onClick={actions.copy} aria-label={`Copy ${label}`}>
        <CopyIcon weight="bold" aria-hidden />
      </button>
      <button
        type="button"
        className={cn(ICON_BUTTON, "pointer-coarse:hidden")}
        onClick={actions.download ?? actions.open}
        aria-label={actions.download === undefined ? `Open ${label}` : `Download ${label}`}
      >
        {actions.download === undefined ? <ArrowSquareOutIcon weight="bold" aria-hidden /> : <DownloadSimpleIcon weight="bold" aria-hidden />}
      </button>
      <MenuRoot>
        <MenuTrigger className={ICON_BUTTON} aria-label={`More for ${label}`}>
          <DotsThreeIcon weight="bold" aria-hidden />
        </MenuTrigger>
        <MenuContent align="end" className="min-w-48">
          <MenuItem onClick={actions.copy}>
            <CopyIcon weight="bold" aria-hidden />
            Copy
          </MenuItem>
          {actions.download !== undefined && (
            <MenuItem onClick={actions.download}>
              <DownloadSimpleIcon weight="bold" aria-hidden />
              Download
            </MenuItem>
          )}
          <MenuItem onClick={actions.open}>
            <ArrowSquareOutIcon weight="bold" aria-hidden />
            {moment.kind === "link" ? "Open link" : "Open original"}
          </MenuItem>
          {actions.share !== undefined && (
            <MenuItem onClick={actions.share}>
              <ShareNetworkIcon weight="bold" aria-hidden />
              Share
            </MenuItem>
          )}
          <MenuSeparator />
          <MenuItem onClick={actions.trash}>
            <TrashIcon weight="bold" aria-hidden />
            Move to Trash
          </MenuItem>
        </MenuContent>
      </MenuRoot>
    </div>
  );
}
