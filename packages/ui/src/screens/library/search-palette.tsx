// Search, everywhere: ⌘K (or /) opens it from any section. Results are instant and local (moments,
// collections, places to go): searching never calls the agent. The last row, "Ask Ambar", does, and only
// then; its answer shows right here, with the best match already copied.
//
// The results are an ARIA combobox + listbox with groups: native <select>/<option>/<optgroup> can't show
// thumbnails, hints and this layout, so the roles are set by hand.
/* oxlint-disable jsx-a11y/prefer-tag-over-role -- custom listbox, see above. */
import { matchesFilter, momentImage, momentLabel, type Collection, type Moment } from "@ambar/core";
import { Dialog } from "@base-ui/react/dialog";
import { FolderIcon, MagnifyingGlassIcon, SparkleIcon } from "@phosphor-icons/react";
import { useEffect, useId, useState, type KeyboardEvent, type ReactNode } from "react";

import { cn } from "../../lib/utils.ts";
import { AnswerPanel, useAsk } from "./answer-panel.tsx";
import { shortDate } from "./format.ts";
import { useLibrary } from "./library-context.tsx";

/** A place the palette can take you (sections, Trash, Settings): provided by the app. */
export type Destination = {
  id: string;
  label: string;
  icon: ReactNode;
  go: () => void;
};

type SearchPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  destinations: Destination[];
  onOpenMoment: (moment: Moment) => void;
  onOpenCollection: (collection: Collection) => void;
  /** Answers come from the simulated agent. */
  simulated: boolean;
};

type Item = {
  id: string;
  group: "Moments" | "Collections" | "Go to" | "Recent" | "Ask";
  label: string;
  hint?: string;
  visual: ReactNode;
  select: () => void;
};

const MAX_MOMENTS = 8;

/** Consecutive items of the same group, keeping each item's position in the flat list (for the keyboard). */
function groupsOf(items: Item[]) {
  const groups: { name: Item["group"]; items: { item: Item; index: number }[] }[] = [];

  items.forEach((item, index) => {
    const last = groups.at(-1);

    if (last?.name === item.group) {
      last.items.push({ item, index });
    } else {
      groups.push({ name: item.group, items: [{ item, index }] });
    }
  });

  return groups;
}

function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
}

/** Opens the palette from anywhere: ⌘K / Ctrl+K, or / when not typing. */
export function useSearchShortcut(open: () => void) {
  useEffect(() => {
    function key(event: globalThis.KeyboardEvent) {
      if ((event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) || (event.key === "/" && !isTyping(event.target))) {
        event.preventDefault();
        open();
      }
    }

    window.addEventListener("keydown", key);

    return () => window.removeEventListener("keydown", key);
  }, [open]);
}

export function SearchPalette({ open, onOpenChange, destinations, onOpenMoment, onOpenCollection, simulated }: SearchPaletteProps) {
  const { moments, collections } = useLibrary();
  const { answer, ask, dismiss } = useAsk();
  const listId = useId();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const text = query.trim();

  /** Every way of closing (Escape, outside click, picking a result) starts the next search fresh. */
  function close(then?: () => void) {
    setQuery("");
    setActive(0);
    dismiss();
    onOpenChange(false);
    then?.();
  }

  const thumb = (moment: Moment) => {
    const src = momentImage(moment);

    return src === undefined ? <span className="size-9 rounded-md bg-muted" /> : <img src={src} alt="" className="size-9 rounded-md object-cover" />;
  };

  const momentItem = (moment: Moment, group: Item["group"]): Item => ({
    id: `m-${moment.id}`,
    group,
    label: momentLabel(moment),
    hint: shortDate(moment.createdAt),
    visual: thumb(moment),
    select: () => close(() => onOpenMoment(moment)),
  });

  const goItems = destinations
    .filter((destination) => text === "" || destination.label.toLowerCase().includes(text.toLowerCase()))
    .map((destination): Item => ({ id: `go-${destination.id}`, group: "Go to", label: destination.label, visual: destination.icon, select: () => close(destination.go) }));

  const items: Item[] =
    text === ""
      ? [...goItems, ...(moments ?? []).slice(0, 5).map((moment) => momentItem(moment, "Recent"))]
      : [
          ...(moments ?? [])
            .filter((moment) => matchesFilter(moment, collections, text))
            .slice(0, MAX_MOMENTS)
            .map((moment) => momentItem(moment, "Moments")),
          ...collections
            .filter((collection) => collection.name.toLowerCase().includes(text.toLowerCase()))
            .map((collection): Item => ({
              id: `c-${collection.id}`,
              group: "Collections",
              label: collection.name,
              visual: <FolderIcon weight="bold" className="size-5" />,
              select: () => close(() => onOpenCollection(collection)),
            })),
          ...goItems,
          {
            id: "ask",
            group: "Ask",
            label: `Ask Ambar: “${text}”`,
            hint: "⌘↵",
            visual: <SparkleIcon weight="fill" className="size-5 text-link" />,
            select: () => void ask(text),
          },
        ];

  const current = Math.min(active, items.length - 1);

  function keyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => (index + (event.key === "ArrowDown" ? 1 : items.length - 1)) % Math.max(items.length, 1));
    } else if (event.key === "Enter" && text !== "" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      void ask(text);
    } else if (event.key === "Enter") {
      event.preventDefault();
      items[current]?.select();
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm transition-opacity duration-200 motion-reduce:transition-none data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Popup className="fixed top-[12vh] left-1/2 z-50 flex max-h-[76vh] w-[min(40rem,calc(100%-1.5rem))] -translate-x-1/2 flex-col overflow-hidden rounded-3xl bg-background text-foreground shadow-[0_24px_64px_rgb(20_20_20/0.25)] outline-hidden transition-[opacity,scale] duration-200 ease-out-soft motion-reduce:transition-none data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0">
          <Dialog.Title className="sr-only">Search your moments</Dialog.Title>
          <div className="flex h-14 shrink-0 items-center gap-3 border-b px-5">
            <MagnifyingGlassIcon weight="bold" aria-hidden className="size-5 shrink-0 text-muted-foreground" />
            <input
              role="combobox"
              aria-expanded
              aria-controls={listId}
              aria-activedescendant={answer === null && items[current] !== undefined ? `${listId}-${items[current].id}` : undefined}
              aria-label="Search moments, collections and places"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(0);
                dismiss();
              }}
              onKeyDown={keyDown}
              placeholder="Search moments, collections…"
              autoComplete="off"
              className="h-full min-w-0 flex-1 bg-transparent text-base outline-hidden placeholder:text-muted-foreground"
            />
            <kbd aria-hidden className="rounded-md border px-1.5 py-0.5 font-sans text-xs text-muted-foreground">
              esc
            </kbd>
          </div>

          <div className="@container min-h-0 flex-1 overflow-y-auto p-2">
            {answer === null ? (
              <div id={listId} role="listbox" aria-label="Results" className="flex flex-col">
                {groupsOf(items).map((group) => (
                  <div key={group.name} role="group" aria-label={group.name} className={cn("flex flex-col", group.name === "Ask" && "mt-2 border-t pt-2")}>
                    {group.name !== "Ask" && (
                      <p aria-hidden className="px-3 pt-3 pb-1 text-xs font-medium text-muted-foreground">
                        {group.name}
                      </p>
                    )}
                    {group.items.map(({ item, index }) => (
                      <div
                        key={item.id}
                        id={`${listId}-${item.id}`}
                        role="option"
                        aria-selected={index === current}
                        tabIndex={-1}
                        onPointerMove={() => setActive(index)}
                        onClick={item.select}
                        onKeyDown={(event) => event.key === "Enter" && item.select()}
                        className={cn("flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm", index === current && "bg-muted")}
                      >
                        <span aria-hidden className="grid size-9 shrink-0 place-items-center text-muted-foreground">
                          {item.visual}
                        </span>
                        <span className={cn("min-w-0 flex-1 truncate", item.group === "Ask" && "font-medium")}>{item.label}</span>
                        {item.hint !== undefined && <span className="shrink-0 text-xs text-muted-foreground">{item.hint}</span>}
                      </div>
                    ))}
                  </div>
                ))}
                {text !== "" && items.length === 1 && <p className="px-3 py-6 text-center text-sm text-muted-foreground">Nothing matches those words. Ask Ambar instead.</p>}
              </div>
            ) : (
              <AnswerPanel answer={answer} simulated={simulated} onOpen={(moment) => close(() => onOpenMoment(moment))} onDismiss={dismiss} />
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
