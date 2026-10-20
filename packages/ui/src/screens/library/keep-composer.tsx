// Keeping from the corner: a "+ Keep" pill at the bottom right that stretches left into a slim bar (link,
// Upload, Keep). Keeping stays one step (paste, Enter); the rest appears only when asked for: + Tags
// (with suggestions, kept as topics), + Collection, + Note, each opening just its own field, and where to
// keep it from the menu on Keep. "Keep on" is a prototype: MOCK_DEVICES, nothing syncs yet.
import { MOCK_DEVICES, normalizeTags, suggestTags } from "@ambar/core";
import { CaretDownIcon, CheckIcon, FileIcon, FilmStripIcon, ImageIcon, LinkIcon, PlusIcon, UploadSimpleIcon, XIcon } from "@phosphor-icons/react";
import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";

import { Button } from "../../components/button.tsx";
import { MenuCheckboxItem, MenuContent, MenuGroup, MenuGroupLabel, MenuRoot, MenuTrigger } from "../../components/menu.tsx";
import { PromptDialog } from "../../components/prompt-dialog.tsx";
import { PLATFORM_ICONS } from "../../lib/platform-icons.ts";
import { cn } from "../../lib/utils.ts";
import { asUrl } from "./keep-zone.tsx";
import { useLibrary } from "./library-context.tsx";

const ACCEPT = "image/*,video/*,application/pdf";

/** Devices chosen before the person changes anything: this one, and whatever else exists today. */
const DEFAULT_DEVICES = MOCK_DEVICES.filter((device) => device.current || device.available).map((device) => device.id);

const LIST = new Intl.ListFormat("en", { type: "conjunction" });

type Extra = "tags" | "collection" | "note";

const EXTRAS: Extra[] = ["tags", "collection", "note"];

const GLASS =
  "border border-ink/5 bg-cloud/95 shadow-[0_0_0_1px_rgb(20_20_20/0.03),0_1px_2px_rgb(20_20_20/0.05),0_12px_32px_rgb(20_20_20/0.10),inset_0_1px_0_rgb(255_255_255/0.7)] supports-[backdrop-filter]:bg-cloud/75 supports-[backdrop-filter]:backdrop-blur-xl supports-[backdrop-filter]:backdrop-saturate-150";

const CHIP =
  "flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm outline-hidden transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-ring motion-reduce:transition-none";

const FIELD =
  "h-10 w-full min-w-0 rounded-xl border border-input bg-cloud px-3 text-base outline-hidden transition-[border-color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40 motion-reduce:transition-none sm:text-sm";

/** Closed: the pill. Open: the bar, as wide as the room allows (the gutter on both sides). */
const WIDTH = { closed: "w-30", open: "w-[min(36rem,calc(100vw-2*var(--spacing-gutter)))]" } as const;

function FileKindIcon({ file }: { file: File }) {
  const props = { weight: "bold", "aria-hidden": true, className: "size-4 shrink-0 text-muted-foreground" } as const;

  if (file.type.startsWith("image/")) return <ImageIcon {...props} />;

  return file.type.startsWith("video/") ? <FilmStripIcon {...props} /> : <FileIcon {...props} />;
}

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((entry) => entry !== item) : [...list, item];
}

export function KeepComposer() {
  const { keep, moments, collections, createCollection } = useLibrary();
  const ids = { form: useId(), link: useId(), error: useId(), tags: useId(), note: useId() };
  const pill = useRef<HTMLButtonElement>(null);
  const linkInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [extras, setExtras] = useState<Extra[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [collectionIds, setCollectionIds] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [deviceIds, setDeviceIds] = useState<string[]>(DEFAULT_DEVICES);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [naming, setNaming] = useState(false);

  // Toasts rise above the bar while it's open (Toaster reads this flag).
  useEffect(() => {
    document.documentElement.dataset.keepComposer = open ? "open" : "closed";
  }, [open]);

  useEffect(
    () => () => {
      delete document.documentElement.dataset.keepComposer;
    },
    [],
  );

  function close() {
    setOpen(false);
    setExtras([]);
    requestAnimationFrame(() => pill.current?.focus());
  }

  // Escape folds the bar back into the pill (the draft stays), unless a menu or dialog is handling it.
  useEffect(() => {
    if (!open || naming) {
      return;
    }

    function escape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape" && !(event.target instanceof Element && event.target.closest("[role=menu]"))) {
        setOpen(false);
        setExtras([]);
        requestAnimationFrame(() => pill.current?.focus());
      }
    }

    window.addEventListener("keydown", escape);

    return () => window.removeEventListener("keydown", escape);
  }, [open, naming]);

  const hasSomething = file !== null || link.trim() !== "";
  const suggestions = suggestTags(file?.name ?? link, moments ?? [], tags, 3);
  const chosenDevices = MOCK_DEVICES.filter((device) => deviceIds.includes(device.id));
  const chosenCollections = collections.filter((collection) => collectionIds.includes(collection.id));

  function openBar() {
    setOpen(true);
    requestAnimationFrame(() => linkInput.current?.focus());
  }

  function reset() {
    setLink("");
    setFile(null);
    setExtras([]);
    setTags([]);
    setTagDraft("");
    setCollectionIds([]);
    setNote("");
    setDeviceIds(DEFAULT_DEVICES);
    setError("");
  }

  function addTags(...next: string[]) {
    setTags((current) => normalizeTags([...current, ...next]));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saving) {
      return;
    }

    const url = file === null ? asUrl(link) : null;

    if (file === null && url === null) {
      setError(link.trim() === "" ? "Paste a link, or use Upload for a photo, clip or PDF." : "That doesn't look like a link. It should start with https://");
      linkInput.current?.focus();

      return;
    }

    const details = { tags: normalizeTags([...tags, tagDraft]), collectionIds, note, deviceIds };

    setSaving(true);

    try {
      await keep(file === null ? { url: url ?? "", ...details } : { file, ...details });
      reset();
      close();
    } catch {
      setError("We couldn't keep it. Try again.");
    } finally {
      setSaving(false);
    }
  }

  function tagKeys(event: KeyboardEvent<HTMLInputElement>) {
    if ((event.key === "Enter" || event.key === ",") && tagDraft.trim() !== "") {
      // A finished tag, not the form: Enter on an empty field still keeps.
      event.preventDefault();
      addTags(tagDraft);
      setTagDraft("");
    } else if (event.key === "Backspace" && tagDraft === "" && tags.length > 0) {
      setTags(tags.slice(0, -1));
    }
  }

  const onlyCollection = chosenCollections.length === 1 ? chosenCollections[0]?.name : undefined;

  const chipLabel: Record<Extra, string> = {
    tags: tags.length === 0 ? "Tags" : `Tags · ${tags.length}`,
    collection: onlyCollection ?? (chosenCollections.length === 0 ? "Collection" : `Collections · ${chosenCollections.length}`),
    note: "Note",
  };

  const filled: Record<Extra, boolean> = { tags: tags.length > 0, collection: chosenCollections.length > 0, note: note.trim() !== "" };

  return (
    <section aria-label="Keep a moment" className="fixed right-gutter bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 flex flex-col items-end gap-2">
      {open && extras.length > 0 && (
        <div className={cn(GLASS, WIDTH.open, "flex max-h-[50dvh] animate-in flex-col gap-4 overflow-y-auto rounded-3xl p-3 duration-200 ease-out-soft fade-in slide-in-from-bottom-1 motion-reduce:animate-none")}>
          {extras.map((extra) => (
            <div key={extra}>
              {extra === "tags" && (
                <div className="flex flex-col gap-2">
                  <label htmlFor={ids.tags} className="sr-only">
                    Tags
                  </label>
                  <div className={cn(FIELD, "flex h-auto min-h-10 flex-wrap items-center gap-1.5 py-1 focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/40")}>
                    {tags.map((tag) => (
                      <span key={tag} className="flex h-7 items-center gap-1 rounded-full bg-sky/40 pr-1 pl-2.5 text-sm">
                        {tag}
                        <button
                          type="button"
                          aria-label={`Remove tag ${tag}`}
                          onClick={() => setTags(tags.filter((item) => item !== tag))}
                          className="grid size-5 place-items-center rounded-full outline-hidden hover:bg-ink/10 focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-ring"
                        >
                          <XIcon weight="bold" aria-hidden className="size-3" />
                        </button>
                      </span>
                    ))}
                    <input
                      id={ids.tags}
                      form={ids.form}
                      value={tagDraft}
                      placeholder={tags.length === 0 ? "Add tags" : undefined}
                      onChange={(event) => setTagDraft(event.target.value.replace(",", ""))}
                      onKeyDown={tagKeys}
                      onBlur={() => {
                        if (tagDraft.trim() !== "") {
                          addTags(tagDraft);
                          setTagDraft("");
                        }
                      }}
                      className="h-8 min-w-24 flex-1 bg-transparent outline-hidden placeholder:text-muted-foreground"
                    />
                  </div>
                  {suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {suggestions.map((tag) => (
                        <button key={tag} type="button" onClick={() => addTags(tag)} aria-label={`Add tag ${tag}`} className={cn(CHIP, "h-7 border-dashed px-2.5 text-muted-foreground hover:text-foreground")}>
                          <PlusIcon weight="bold" aria-hidden className="size-3" />
                          {tag}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {extra === "collection" && (
                <fieldset className="flex min-w-0 flex-wrap gap-1.5">
                  <legend className="sr-only">Collection</legend>
                  {collections.map((collection) => {
                    const inside = collectionIds.includes(collection.id);

                    return (
                      <button
                        key={collection.id}
                        type="button"
                        aria-pressed={inside}
                        onClick={() => setCollectionIds(toggle(collectionIds, collection.id))}
                        className={cn(CHIP, inside ? "border-ink bg-ink text-cloud" : "hover:bg-muted")}
                      >
                        {inside && <CheckIcon weight="bold" aria-hidden className="size-3.5" />}
                        {collection.name}
                      </button>
                    );
                  })}
                  <button type="button" onClick={() => setNaming(true)} className={cn(CHIP, "gap-1 border-dashed text-muted-foreground hover:text-foreground")}>
                    <PlusIcon weight="bold" aria-hidden className="size-3.5" />
                    New
                  </button>
                </fieldset>
              )}

              {extra === "note" && (
                <>
                  <label htmlFor={ids.note} className="sr-only">
                    Note
                  </label>
                  <input id={ids.note} form={ids.form} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Why you kept it, for later" className={FIELD} />
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {open && hasSomething && (
        <div className="flex animate-in flex-wrap justify-end gap-1.5 duration-200 ease-out-soft fade-in motion-reduce:animate-none">
          {EXTRAS.map((extra) => (
            <button
              key={extra}
              type="button"
              aria-expanded={extras.includes(extra)}
              onClick={() => setExtras(toggle(extras, extra))}
              className={cn(GLASS, CHIP, "text-muted-foreground hover:text-foreground", (extras.includes(extra) || filled[extra]) && "text-foreground")}
            >
              {filled[extra] ? <CheckIcon weight="bold" aria-hidden className="size-3.5 text-leaf" /> : <PlusIcon weight="bold" aria-hidden className="size-3.5" />}
              {chipLabel[extra]}
            </button>
          ))}
        </div>
      )}

      {open && error !== "" && (
        <p id={ids.error} role="alert" className={cn(GLASS, "rounded-full px-4 py-1.5 text-sm text-destructive")}>
          {error}
        </p>
      )}

      {/* One box from the pill to the bar: its width animates, anchored right, so the bar opens to the left. */}
      <div className={cn("overflow-hidden rounded-full transition-[width] duration-300 ease-out-soft motion-reduce:transition-none", open ? WIDTH.open : WIDTH.closed)}>
        {open ? (
          <form
            id={ids.form}
            noValidate
            onSubmit={submit}
            className={cn(GLASS, WIDTH.open, "@container/bar flex h-14 animate-in items-center gap-1 rounded-full p-1.5 pl-4 duration-300 ease-out-soft fade-in slide-in-from-right-2 motion-reduce:animate-none")}
          >
            {file === null ? (
              <>
                <LinkIcon weight="bold" aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                <label htmlFor={ids.link} className="sr-only">
                  Link to keep
                </label>
                <input
                  ref={linkInput}
                  id={ids.link}
                  type="url"
                  inputMode="url"
                  autoComplete="url"
                  aria-describedby={error === "" ? undefined : ids.error}
                  aria-invalid={error !== "" || undefined}
                  placeholder="Paste a link"
                  value={link}
                  onChange={(event) => {
                    setLink(event.target.value);
                    setError("");
                  }}
                  className="h-full min-w-0 flex-1 bg-transparent px-2 text-base outline-hidden placeholder:text-muted-foreground sm:text-sm"
                />
              </>
            ) : (
              <div className="flex min-w-0 flex-1 items-center gap-2 px-1 text-sm">
                <FileKindIcon file={file} />
                <span className="truncate">{file.name}</span>
                <button
                  type="button"
                  aria-label={`Remove ${file.name}`}
                  onClick={() => {
                    setFile(null);
                    requestAnimationFrame(() => linkInput.current?.focus());
                  }}
                  className="grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground outline-hidden hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-ring"
                >
                  <XIcon weight="bold" aria-hidden className="size-3.5" />
                </button>
              </div>
            )}

            <Button type="button" tone="cloud" size="icon" aria-label="Upload a photo, clip or PDF" onClick={() => fileInput.current?.click()} className="shrink-0 rounded-full">
              <UploadSimpleIcon weight="bold" />
            </Button>

            {/* Keep, and where to keep it (▾): one split control. */}
            <div className="flex shrink-0">
              <Button type="submit" loading={saving} className="rounded-l-full rounded-r-none pr-3 pl-4">
                {/* The chosen devices at a glance; on a narrow bar the link gets the room. */}
                <span aria-hidden className="flex items-center gap-0.5 opacity-80 @max-sm/bar:hidden">
                  {chosenDevices.map((device) => {
                    const Icon = PLATFORM_ICONS[device.platform];

                    return <Icon key={device.id} weight="bold" />;
                  })}
                </span>
                Keep
                <span className="sr-only"> on {LIST.format(chosenDevices.map((device) => device.name))}</span>
              </Button>
              <MenuRoot>
                <MenuTrigger
                  aria-label="Where to keep it"
                  className="grid h-10 w-8 place-items-center rounded-r-full border-l border-cloud/15 bg-ink text-cloud outline-hidden hover:bg-ink/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-ring"
                >
                  <CaretDownIcon weight="bold" aria-hidden className="size-3.5" />
                </MenuTrigger>
                <MenuContent align="end" className="w-72">
                  <MenuGroup>
                    <MenuGroupLabel>Keep on</MenuGroupLabel>
                    {MOCK_DEVICES.map((device) => {
                      const Icon = PLATFORM_ICONS[device.platform];
                      const status = device.current ? "This device" : device.available ? undefined : "Later";

                      return (
                        <MenuCheckboxItem
                          key={device.id}
                          checked={deviceIds.includes(device.id)}
                          // Always kept where you are; platforms that don't exist yet can't be chosen.
                          disabled={device.current || !device.available}
                          onCheckedChange={() => setDeviceIds(toggle(deviceIds, device.id))}
                        >
                          <Icon weight="bold" aria-hidden />
                          <span className="flex-1">{device.name}</span>
                          {status !== undefined && <span className="text-xs text-muted-foreground">{status}</span>}
                        </MenuCheckboxItem>
                      );
                    })}
                  </MenuGroup>
                  <p className="px-3 pt-2 pb-1 text-xs text-muted-foreground">Preview: devices don't sync yet.</p>
                </MenuContent>
              </MenuRoot>
            </div>

            <Button type="button" tone="cloud" size="icon" aria-label="Close" onClick={close} className="shrink-0 rounded-full">
              <XIcon weight="bold" />
            </Button>
          </form>
        ) : (
          <Button ref={pill} size="lg" aria-expanded={false} aria-label="Keep a moment" onClick={openBar} className="w-full rounded-full">
            <PlusIcon weight="bold" aria-hidden />
            Keep
          </Button>
        )}
      </div>

      <PromptDialog
        open={naming}
        onOpenChange={setNaming}
        title="New collection"
        label="Name"
        placeholder="Recipes, References, Sets…"
        submitLabel="Create"
        onSubmit={async (name) => {
          if (name === "") {
            return "Give it a name.";
          }

          const collection = await createCollection(name);

          setCollectionIds((current) => [...current, collection.id]);

          return undefined;
        }}
      />
      <input
        ref={fileInput}
        type="file"
        accept={ACCEPT}
        hidden
        onChange={(event) => {
          const picked = event.target.files?.[0];

          if (picked !== undefined) {
            setFile(picked);
            setError("");
          }

          event.target.value = "";
        }}
      />
    </section>
  );
}
