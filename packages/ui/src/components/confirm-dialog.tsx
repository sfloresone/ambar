// Confirm something that can't be undone (Empty Trash). Base UI AlertDialog: focus starts on Cancel,
// Escape cancels. Reversible actions don't ask; they offer Undo instead.
import { AlertDialog } from "@base-ui/react/alert-dialog";

import { Button } from "./button.tsx";

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
};

export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel, onConfirm }: ConfirmDialogProps) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="fixed inset-0 z-60 bg-ink/40 transition-opacity duration-200 motion-reduce:transition-none data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <AlertDialog.Popup className="fixed top-1/2 left-1/2 z-60 flex w-[min(26rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-3xl bg-background p-6 text-foreground transition-[opacity,scale] duration-200 ease-out-soft motion-reduce:transition-none data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
          <AlertDialog.Title className="text-xl tracking-tight">{title}</AlertDialog.Title>
          <AlertDialog.Description className="text-pretty text-muted-foreground">{description}</AlertDialog.Description>
          <div className="flex justify-end gap-2">
            <AlertDialog.Close render={<Button tone="cloud" size="md" />}>Cancel</AlertDialog.Close>
            <Button
              tone="danger"
              size="md"
              onClick={() => {
                onConfirm();
                onOpenChange(false);
              }}
            >
              {confirmLabel}
            </Button>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
