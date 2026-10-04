// "Start keeping" onboarding. Base UI Dialog handles focus trap, Escape and returning focus to the trigger.
import { Dialog } from "@base-ui/react/dialog";
import { XIcon } from "@phosphor-icons/react";
import { lazy, Suspense } from "react";

import { Button, buttonVariants, type ButtonSize, type ButtonTone } from "./button.tsx";

// Motion and the dropzone stay out of the page bundle until the dialog opens.
const FirstMoment = lazy(() => import("./first-moment.tsx"));

type FirstMomentDialogProps = {
  /** Where "Continue to Ámbar" goes once a moment is kept. */
  continueHref: string;
  label?: string;
  tone?: ButtonTone;
  size?: ButtonSize;
};

export function FirstMomentDialog({ continueHref, label = "Start keeping", tone = "ink", size = "lg" }: FirstMomentDialogProps) {
  return (
    <Dialog.Root>
      <Dialog.Trigger className={buttonVariants({ tone, size })}>{label}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop
          className={
            "fixed inset-0 bg-ink/50 backdrop-blur-sm transition-opacity duration-500 motion-reduce:transition-none data-ending-style:opacity-0 data-starting-style:opacity-0"
          }
        />
        <Dialog.Popup
          className={
            "fixed top-1/2 left-1/2 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl bg-background p-6 text-foreground sm:p-10 transition-[opacity,scale,filter] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 data-starting-style:blur-sm"
          }
        >
          <Dialog.Close
            render={<Button tone="cloud" size="icon-sm" aria-label="Close" className="absolute top-4 right-4" />}
          >
            <XIcon weight="bold" />
          </Dialog.Close>
          <Suspense fallback={<div className="min-h-96" />}>
            <FirstMoment continueHref={continueHref} />
          </Suspense>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
