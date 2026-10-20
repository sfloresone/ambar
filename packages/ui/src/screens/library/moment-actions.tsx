// Quick actions on a moment: copy, download (or open, for links), and more. Used on cards and in the
// answer panel. Every action reports back with a toast, so it's clear what happened.
import { momentLabel, type Moment } from "@ambar/core";
import { ArrowSquareOutIcon, CopyIcon, DotsThreeIcon, DownloadSimpleIcon, FrameCornersIcon, PencilSimpleIcon, ShareNetworkIcon, TrashIcon } from "@phosphor-icons/react";
import { useRef, useState } from "react";

import { Button } from "../../components/button.tsx";
import { MenuContent, type MenuContainer, MenuItem, MenuRoot, MenuSeparator, MenuTrigger } from "../../components/menu.tsx";
import { useToast } from "../../components/toaster.tsx";
import { usePlatformActions } from "../../lib/platform-actions.ts";
import { cn } from "../../lib/utils.ts";
import { useLibrary } from "./library-context.tsx";
import { EditMomentDialog } from "./edit-moment-dialog.tsx";

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
    canvas() {
      void library.setCanvas(moment, !moment.onCanvas).catch(() => {
        toast.add({ title: "Couldn't update Canvas", description: "Please try again." });
      });
    },
    /** Reversible: the toast offers Undo, and the Trash keeps it for TRASH_DAYS. */
    trash() {
      void library.moveToTrash(moment);
    },
  };
}

type QuickActionsProps = {
  moment: Moment;
  className?: string;
};

/** Shortcuts reveal on intent; the menu stays in the footer. */
export function QuickActions({ moment, className }: QuickActionsProps) {
  const actions = useMomentActions(moment);
  const label = momentLabel(moment);

  return (
    <div className={cn("flex gap-1.5", className)}>
      <Button tone="cloud" size="icon-sm" className="rounded-full" onClick={actions.copy} aria-label={`Copy ${label}`}>
        <CopyIcon weight="bold" aria-hidden />
      </Button>
      <Button
        tone="cloud"
        size="icon-sm"
        className="rounded-full"
        onClick={actions.download ?? actions.open}
        aria-label={actions.download === undefined ? `Open ${label}` : `Download ${label}`}
      >
        {actions.download === undefined ? <ArrowSquareOutIcon weight="bold" aria-hidden /> : <DownloadSimpleIcon weight="bold" aria-hidden />}
      </Button>
    </div>
  );
}

/** The same menu for every kind of moment, anchored outside the preview. */
export function MomentMenu({ moment, container }: { moment: Moment; container: MenuContainer }) {
  const actions = useMomentActions(moment);
  const label = momentLabel(moment);
  const [editing, setEditing] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);

  return (
    <>
      <MenuRoot>
        <MenuTrigger render={<Button ref={trigger} tone="cloud" size="icon-sm" aria-label={`More for ${label}`} />}>
          <DotsThreeIcon weight="bold" aria-hidden />
        </MenuTrigger>
        <MenuContent container={container} align="end" className="min-w-48">
          <MenuItem onClick={() => setEditing(true)}>
            <PencilSimpleIcon weight="bold" aria-hidden />
            Edit title
          </MenuItem>
          <MenuItem onClick={actions.canvas}>
            <FrameCornersIcon weight="bold" aria-hidden />
            {moment.onCanvas ? "Remove from Canvas" : "Add to Canvas"}
          </MenuItem>
          <MenuSeparator />
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
          <MenuItem onClick={actions.trash} className="text-destructive">
            <TrashIcon weight="bold" aria-hidden />
            Move to Trash
          </MenuItem>
        </MenuContent>
      </MenuRoot>
      <EditMomentDialog moment={moment} open={editing} onOpenChange={setEditing} returnFocus={trigger} />
    </>
  );
}
