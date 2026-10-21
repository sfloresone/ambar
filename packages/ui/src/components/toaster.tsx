// Short notices ("Copied — paste it anywhere", "Kept · Add to Space"), on Base UI Toast: announced to
// screen readers, swipe or Escape to dismiss, pause on hover. One Toaster per app, under ToastProvider.
import { Toast } from "@base-ui/react/toast";
import { XIcon } from "@phosphor-icons/react";

import { cn } from "../lib/utils.ts";
import { buttonVariants } from "./button.tsx";

export const ToastProvider = Toast.Provider;

export const useToast = Toast.useToastManager;

export function Toaster() {
  const { toasts } = Toast.useToastManager();

  return (
    <Toast.Portal>
      <Toast.Viewport className="fixed bottom-4 left-1/2 in-data-[keep-composer=open]:bottom-24 max-sm:in-data-[keep-composer=closed]:bottom-20 z-60 flex w-[min(26rem,calc(100%-2rem))] -translate-x-1/2 flex-col gap-2 outline-hidden">
        {toasts.map((toast) => (
          <Toast.Root
            key={toast.id}
            toast={toast}
            className={cn(
              "flex items-center gap-3 rounded-2xl bg-ink py-3 pr-2 pl-4 text-cloud shadow-[0_12px_32px_rgb(20_20_20/0.25)] dark:bg-cloud dark:text-ink",
              "transition-[opacity,translate] duration-300 ease-out-soft motion-reduce:transition-none data-ending-style:translate-y-2 data-ending-style:opacity-0 data-starting-style:translate-y-2 data-starting-style:opacity-0",
            )}
          >
            <Toast.Content className="flex min-w-0 flex-1 flex-col">
              <Toast.Title className="text-sm font-medium" />
              <Toast.Description className="truncate text-sm text-cloud/70 dark:text-muted-foreground" />
            </Toast.Content>
            {toast.actionProps !== undefined && <Toast.Action className={buttonVariants({ tone: "cloud", size: "sm", className: "shrink-0 rounded-full" })} />}
            <Toast.Close aria-label="Dismiss" className="grid size-8 shrink-0 place-items-center rounded-full text-cloud/70 outline-hidden hover:text-cloud focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-sky dark:text-muted-foreground dark:hover:text-foreground">
              <XIcon weight="bold" aria-hidden className="size-4" />
            </Toast.Close>
          </Toast.Root>
        ))}
      </Toast.Viewport>
    </Toast.Portal>
  );
}
