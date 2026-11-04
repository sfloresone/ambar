// A moment up close: the media large (a clip plays), where and when it came from, what Ambar read in it,
// and its collections, toggled with a tap. Actions: copy, download, open, share, delete. A dialog on
// wide screens, a tall sheet on narrow ones.
import { momentLabel, type Collection, type Moment } from "@ambar/core";
import { Dialog } from "@base-ui/react/dialog";
import { ArrowSquareOutIcon, CheckIcon, CopyIcon, DownloadSimpleIcon, PlusIcon, ShareNetworkIcon, TrashIcon, XIcon } from "@phosphor-icons/react";
import { useState } from "react";

import { Button } from "../../components/button.tsx";
import { PromptDialog } from "../../components/prompt-dialog.tsx";
import { cn } from "../../lib/utils.ts";
import { shortDate, sourceOf } from "./format.ts";
import { useLibrary } from "./library-context.tsx";
import { useMomentActions } from "./moment-actions.tsx";

type MomentViewerProps = {
  /** The moment to show; null closes the viewer. */
  moment: Moment | null;
  onClose: () => void;
};

export function MomentViewer({ moment, onClose }: MomentViewerProps) {
  return (
    <Dialog.Root open={moment !== null} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-sm transition-opacity duration-300 motion-reduce:transition-none data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Popup
          className={cn(
            "fixed z-50 flex flex-col overflow-hidden bg-background text-foreground outline-hidden",
            "inset-x-0 top-8 bottom-0 rounded-t-3xl md:inset-auto md:top-1/2 md:left-1/2 md:h-[min(46rem,calc(100dvh-4rem))] md:w-[min(64rem,calc(100%-3rem))] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-3xl",
            "transition-[opacity,translate,scale] duration-300 ease-out-soft motion-reduce:transition-none data-ending-style:opacity-0 data-starting-style:opacity-0 max-md:data-ending-style:translate-y-8 max-md:data-starting-style:translate-y-8 md:data-ending-style:scale-95 md:data-starting-style:scale-95",
          )}
        >
          {moment !== null && <ViewerContent moment={moment} onClose={onClose} />}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ViewerContent({ moment, onClose }: { moment: Moment; onClose: () => void }) {
  const actions = useMomentActions(moment);
  const { collections, setCollections, createCollection } = useLibrary();
  const [naming, setNaming] = useState(false);
  const source = sourceOf(moment);

  function toggle(collection: Collection) {
    const inside = moment.collectionIds.includes(collection.id);

    void setCollections(moment.id, inside ? moment.collectionIds.filter((id) => id !== collection.id) : [...moment.collectionIds, collection.id]);
  }

  async function newCollection(name: string) {
    const collection = await createCollection(name);

    await setCollections(moment.id, [...moment.collectionIds, collection.id]);

    return undefined;
  }

  return (
    <div className="grid min-h-0 flex-1 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div className="relative grid min-h-64 place-items-center overflow-hidden bg-muted max-md:max-h-[45dvh]">
        <ViewerMedia moment={moment} />
      </div>
      <div className="flex min-h-0 flex-col gap-6 overflow-y-auto p-6">
        <header className="flex items-start gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <Dialog.Title className="text-2xl tracking-tight text-balance">{momentLabel(moment)}</Dialog.Title>
            <Dialog.Description className="text-sm text-muted-foreground">
              {[source, shortDate(moment.createdAt)].filter(Boolean).join(" · ")}
            </Dialog.Description>
          </div>
          <Dialog.Close render={<Button tone="cloud" size="icon-sm" aria-label="Close" className="shrink-0" />}>
            <XIcon weight="bold" />
          </Dialog.Close>
        </header>

        <div className="flex flex-wrap gap-2">
          <Button size="md" onClick={() => actions.copy()}>
            <CopyIcon weight="bold" aria-hidden />
            Copy
          </Button>
          {actions.download !== undefined && (
            <Button tone="cloud" size="md" onClick={actions.download}>
              <DownloadSimpleIcon weight="bold" aria-hidden />
              Download
            </Button>
          )}
          <Button tone="cloud" size="md" onClick={actions.open}>
            <ArrowSquareOutIcon weight="bold" aria-hidden />
            {moment.kind === "link" ? "Open link" : moment.kind === "file" ? "Open PDF" : "Open original"}
          </Button>
          {actions.share !== undefined && (
            <Button tone="cloud" size="md" onClick={actions.share}>
              <ShareNetworkIcon weight="bold" aria-hidden />
              Share
            </Button>
          )}
        </div>

        <section aria-label="Collections" className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">Collections</h3>
          <div className="flex flex-wrap gap-2">
            {collections.map((collection) => {
              const inside = moment.collectionIds.includes(collection.id);

              return (
                <button
                  key={collection.id}
                  type="button"
                  aria-pressed={inside}
                  onClick={() => toggle(collection)}
                  className={cn(
                    "flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm outline-hidden transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-ring",
                    inside ? "border-ink bg-ink text-cloud dark:border-cloud dark:bg-cloud dark:text-ink" : "hover:bg-muted",
                  )}
                >
                  {inside && <CheckIcon weight="bold" aria-hidden className="size-3.5" />}
                  {collection.name}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setNaming(true)}
              className="flex h-8 items-center gap-1 rounded-full border border-dashed px-3 text-sm text-muted-foreground outline-hidden hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-ring"
            >
              <PlusIcon weight="bold" aria-hidden className="size-3.5" />
              New
            </button>
          </div>
        </section>

        {moment.topics.length > 0 && (
          <section aria-label="About" className="flex flex-col gap-2">
            <h3 className="text-sm font-medium">About</h3>
            <p className="flex flex-wrap gap-1.5">
              {moment.topics.map((topic) => (
                <span key={topic} className="rounded-full bg-muted px-2.5 py-0.5 text-sm text-muted-foreground">
                  {topic}
                </span>
              ))}
            </p>
          </section>
        )}

        {moment.note !== undefined && <p className="rounded-2xl bg-muted p-4 text-pretty">{moment.note}</p>}

        {moment.readings !== undefined && (
          <section aria-label="Read in it" className="flex flex-col gap-1.5">
            <h3 className="text-sm font-medium">Read in it</h3>
            <p className="text-sm text-pretty text-muted-foreground">“{moment.readings}”</p>
          </section>
        )}

        <PromptDialog open={naming} onOpenChange={setNaming} title="New collection" label="Name" placeholder="Recipes, References, Sets…" submitLabel="Create" onSubmit={newCollection} />

        <div className="mt-auto pt-2">
          <Button
            tone="cloud"
            size="sm"
            onClick={() => {
              actions.trash();
              onClose();
            }}
          >
            <TrashIcon weight="bold" aria-hidden />
            Move to Trash
          </Button>
        </div>
      </div>
    </div>
  );
}

function ViewerMedia({ moment }: { moment: Moment }) {
  switch (moment.kind) {
    case "photo":
      return <img src={moment.mediaUrl} alt={momentLabel(moment)} className="max-h-full max-w-full object-contain" />;
    case "clip":
      return (
        // A muted clip with controls; there is no transcript to offer for a user's own moment yet.
        // oxlint-disable-next-line jsx-a11y/media-has-caption -- the user's own clip; no captions exist for it.
        <video src={moment.mediaUrl} poster={moment.posterUrl} controls playsInline muted className="max-h-full max-w-full" aria-label={momentLabel(moment)} />
      );
    case "link":
      return moment.imageUrl === undefined ? (
        <p className="p-6 text-center text-muted-foreground">{moment.url}</p>
      ) : (
        <img src={moment.imageUrl} alt="" className="max-h-full max-w-full object-contain" />
      );
    case "file":
      return <img src={moment.previewUrl} alt={`First page of ${moment.name}`} className="max-h-[90%] max-w-[90%] rounded-sm object-contain shadow-[0_12px_32px_rgb(20_20_20/0.15)]" />;
  }
}
