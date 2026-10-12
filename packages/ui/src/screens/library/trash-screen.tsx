// The Trash: deleted moments wait here TRASH_DAYS before they are erased. Restore or erase each; empty all.
import { momentImage, momentLabel, TRASH_DAYS, trashDaysLeft } from "@ambar/core";
import { ArrowCounterClockwiseIcon, TrashIcon } from "@phosphor-icons/react";
import { useState } from "react";

import { Button } from "../../components/button.tsx";
import { ConfirmDialog } from "../../components/confirm-dialog.tsx";
import { useLibrary } from "./library-context.tsx";
import { LoadingGrid } from "./loading-grid.tsx";

export function TrashScreen() {
  const { trash, restore, purge, emptyTrash } = useLibrary();
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="@container flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 tabIndex={-1} className="text-3xl tracking-tight">
            Trash
          </h1>
          <p className="text-muted-foreground">Deleted moments stay here for {TRASH_DAYS} days, then they're gone for good.</p>
        </div>
        {trash !== null && trash.length > 0 && (
          <Button tone="cloud" size="md" onClick={() => setConfirming(true)}>
            Empty Trash
          </Button>
        )}
      </header>

      {trash === null && <LoadingGrid />}
      {trash?.length === 0 && <p className="py-16 text-center text-muted-foreground">The Trash is empty.</p>}

      {trash !== null && trash.length > 0 && (
        <ul className="grid grid-cols-1 gap-4 @md:grid-cols-2 @3xl:grid-cols-3">
          {trash.map((moment) => {
            const days = moment.deletedAt === undefined ? TRASH_DAYS : trashDaysLeft(moment.deletedAt);
            const image = momentImage(moment);

            return (
              <li key={moment.id} className="flex items-center gap-3 rounded-2xl border bg-card p-2.5">
                <div className="size-16 shrink-0 overflow-hidden rounded-xl bg-muted">
                  {image !== undefined && <img src={image} alt="" loading="lazy" decoding="async" className="size-full object-cover opacity-80 grayscale-[0.4]" />}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <p className="truncate text-sm font-medium">{momentLabel(moment)}</p>
                  <p className="text-xs text-muted-foreground">{days <= 1 ? "Erased tomorrow" : `${days} days left`}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button tone="cloud" size="icon-sm" aria-label={`Restore ${momentLabel(moment)}`} onClick={() => void restore(moment.id)}>
                    <ArrowCounterClockwiseIcon weight="bold" />
                  </Button>
                  <Button tone="cloud" size="icon-sm" aria-label={`Delete ${momentLabel(moment)} forever`} onClick={() => void purge(moment.id)}>
                    <TrashIcon weight="bold" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Empty the Trash?"
        description="Everything in it is erased for good. This can't be undone."
        confirmLabel="Empty Trash"
        onConfirm={() => void emptyTrash()}
      />
    </div>
  );
}
