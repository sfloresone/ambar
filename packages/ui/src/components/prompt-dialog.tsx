// Ask for one short value (a link, a collection name) in a small dialog. Replaces window.prompt, which
// desktop shells and extension popups don't support and which can't be styled.
import { Dialog } from "@base-ui/react/dialog";
import { useId, useState, type FormEvent } from "react";

import { Button } from "./button.tsx";
import { Input } from "./input.tsx";
import { Label } from "./label.tsx";

type PromptDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  label: string;
  placeholder?: string;
  type?: "text" | "url";
  submitLabel: string;
  /** Return an error message to keep the dialog open, or nothing to close it. */
  onSubmit: (value: string) => string | undefined | Promise<string | undefined>;
};

export function PromptDialog({ open, onOpenChange, title, label, placeholder, type = "text", submitLabel, onSubmit }: PromptDialogProps) {
  const inputId = useId();
  const errorId = useId();
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const problem = await onSubmit(value.trim());

    if (problem === undefined) {
      setValue("");
      setError("");
      onOpenChange(false);
    } else {
      setError(problem);
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setError("");
        onOpenChange(next);
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-60 bg-ink/40 transition-opacity duration-200 motion-reduce:transition-none data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-60 w-[min(26rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-background p-6 text-foreground transition-[opacity,scale] duration-200 ease-out-soft motion-reduce:transition-none data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
          <Dialog.Title className="mb-4 text-xl tracking-tight">{title}</Dialog.Title>
          <form noValidate onSubmit={submit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor={inputId}>{label}</Label>
              <Input
                id={inputId}
                type={type}
                inputMode={type === "url" ? "url" : undefined}
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder={placeholder}
                aria-invalid={error !== "" || undefined}
                aria-describedby={error === "" ? undefined : errorId}
                className="h-11"
              />
              <p id={errorId} aria-live="polite" className="min-h-5 text-sm font-medium text-destructive">
                {error}
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Dialog.Close render={<Button tone="cloud" size="md" />}>Cancel</Dialog.Close>
              <Button type="submit" size="md" disabled={value.trim() === ""}>
                {submitLabel}
              </Button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
