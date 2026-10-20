import { momentLabel, type Moment } from "@ambar/core";
import { Dialog } from "@base-ui/react/dialog";
import { useId, useRef, useState, type FormEvent, type RefObject } from "react";

import { Button } from "../../components/button.tsx";
import { Input } from "../../components/input.tsx";
import { Label } from "../../components/label.tsx";
import { useLibrary } from "./library-context.tsx";

type EditMomentDialogProps = {
  moment: Moment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnFocus: RefObject<HTMLButtonElement | null>;
};

export function EditMomentDialog({ moment, open, onOpenChange, returnFocus }: EditMomentDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-60 bg-ink/40 transition-opacity duration-200 motion-reduce:transition-none data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Popup finalFocus={returnFocus} className="fixed top-1/2 left-1/2 z-60 w-[min(26rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-background p-6 text-foreground outline-hidden">
          <Dialog.Title className="text-xl tracking-tight">Edit title</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-muted-foreground">Give this moment a name you will remember.</Dialog.Description>
          <EditTitleForm moment={moment} onDone={() => onOpenChange(false)} />
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function EditTitleForm({ moment, onDone }: { moment: Moment; onDone: () => void }) {
  const { renameMoment } = useLibrary();
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(momentLabel(moment));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saving) {
      return;
    }

    if (title.trim() === "") {
      setError("Enter a title.");
      input.current?.focus();

      return;
    }

    setSaving(true);
    setError("");

    try {
      await renameMoment(moment.id, title);
      onDone();
    } catch {
      setError("Couldn't save the title. Please try again.");
      input.current?.focus();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="mt-5 flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor={id}>Title</Label>
        <Input
          ref={input}
          id={id}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={200}
          readOnly={saving}
          aria-invalid={error !== "" || undefined}
          aria-describedby={`${id}-error`}
          className="h-11"
        />
        <p id={`${id}-error`} aria-live="polite" className="min-h-5 text-sm text-destructive">
          {error}
        </p>
      </div>
      <div className="flex justify-end gap-2">
        <Dialog.Close render={<Button tone="cloud" disabled={saving} />}>Cancel</Dialog.Close>
        <Button type="submit" tone="leaf" loading={saving}>
          Save
        </Button>
      </div>
    </form>
  );
}
