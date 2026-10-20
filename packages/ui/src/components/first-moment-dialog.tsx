// "Start keeping" onboarding. Base UI Dialog handles focus trap, Escape and returning focus to the trigger.
import { AUTH_RETURN_PARAMS, readAuthReturn, type AuthReturn } from "@ambar/core";
import { Dialog } from "@base-ui/react/dialog";
import { XIcon } from "@phosphor-icons/react";
import { lazy, Suspense, useEffect, useState, type ComponentType } from "react";

import { FRAME_WIDTH } from "../lib/layout.ts";
import { cn } from "../lib/utils.ts";
import { Button, buttonVariants, type ButtonSize, type ButtonTone } from "./button.tsx";
// Type-only: erased at build, so the lazy chunk stays out of the page bundle.
import type { AuthDialogContentProps } from "./auth-dialog-content.tsx";
import type { AuthMode } from "./auth-flow.tsx";


// Motion and the dropzone stay out of the page bundle until they are needed.
// Once the chunk is in, render it directly: going through lazy/Suspense again would hold the fallback
// for React's ~300 ms Suspense throttle even though the code is already there.
let loadedContent: ComponentType<AuthDialogContentProps> | null = null;

const loadContent = () =>
  import("./auth-dialog-content.tsx").then((module) => {
    loadedContent = module.default;

    return module;
  });

const LazyContent = lazy(loadContent);

/** Rendered when the popup mounts (on open), so it picks the preloaded module if it's there. */
function OnboardingContent(props: AuthDialogContentProps) {
  const Content = loadedContent ?? LazyContent;

  return <Content {...props} />;
}

let preloaded = false;

/**
 * Starts downloading the dialog content and the backdrop photo as soon as someone shows intent
 * (hover, focus, touch), so by the click they are usually ready and the develop starts on time.
 */
function preload(backdropSrc: string | undefined) {
  if (preloaded) {
    return;
  }

  preloaded = true;
  void loadContent();

  if (backdropSrc !== undefined) {
    new Image().src = backdropSrc;
  }
}

type FirstMomentDialogProps = {
  /** Where "Continue to Ambar" goes once a moment is kept. */
  continueHref: string;
  /** Faint photo that develops behind the title. Pass an optimized image. */
  backdropSrc?: string;
  /** Real API base URL for the keep flow; unset = mock clients. */
  apiUrl?: string;
  /**
   * The dialog that finishes a sign-in that comes back to this page: the email link (?verify=) or Google /
   * GitHub (?oauth=, ?error=). Exactly one dialog per page should set it, so one dialog reopens, not every
   * "Start keeping" button.
   */
  handlesAuthReturn?: boolean;
  /** sign-up (default, "Start keeping"): the moment first, then email and code. sign-in: email and code. */
  mode?: AuthMode;
  /** Extra classes for the trigger button (e.g. rounded-full in the header pill). */
  className?: string;
  label?: string;
  tone?: ButtonTone;
  size?: ButtonSize;
};

export function FirstMomentDialog({
  continueHref,
  backdropSrc,
  apiUrl,
  handlesAuthReturn = false,
  mode = "sign-up",
  className,
  label = mode === "sign-in" ? "Sign in" : "Start keeping",
  tone = "ink",
  size = "lg",
}: FirstMomentDialogProps) {
  const warm = () => preload(backdropSrc);
  const [open, setOpen] = useState(false);
  const [authReturn, setAuthReturn] = useState<AuthReturn | undefined>(undefined);

  // The email link (?verify=) or a provider (?oauth=, ?error=) lands here: reopen the flow to finish, and
  // clean the URL (one-time values never linger in history).
  // An effect on purpose: the URL only exists in the browser, not while Astro renders the island.
  useEffect(() => {
    if (!handlesAuthReturn) {
      return;
    }

    const url = new URL(window.location.href);
    const found = readAuthReturn(url.searchParams);

    // "linked" belongs to Settings (connecting a provider), not to a sign-in.
    if (found === null || found.kind === "linked") {
      return;
    }

    for (const param of AUTH_RETURN_PARAMS) {
      url.searchParams.delete(param);
    }

    window.history.replaceState(null, "", url);
    // oxlint-disable-next-line react/set-state-in-effect -- syncing from the URL, which only exists in the browser.
    setAuthReturn(found);
    setOpen(true);
  }, [handlesAuthReturn]);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger className={buttonVariants({ tone, size, className })} onPointerEnter={warm} onFocus={warm} onTouchStart={warm}>
        {label}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop
          className={
            "fixed inset-0 z-50 bg-ink/50 backdrop-blur-sm transition-opacity duration-500 motion-reduce:transition-none data-ending-style:opacity-0 data-starting-style:opacity-0"
          }
        />
        <Dialog.Popup
          className={
            // Opacity and scale only: the content develops on its own; a popup-wide blur would double the paint cost.
            cn(
              FRAME_WIDTH,
              "fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl bg-background text-foreground",
              "transition-[opacity,scale] duration-500 ease-settle motion-reduce:transition-none data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0",
            )
          }
        >
          <Dialog.Close
            render={<Button tone="cloud" size="icon-sm" aria-label="Close" className="absolute top-4 right-4 z-10" />}
          >
            <XIcon weight="bold" />
          </Dialog.Close>
          <Suspense fallback={<div className="min-h-96" />}>
            <OnboardingContent continueHref={continueHref} backdropSrc={backdropSrc} apiUrl={apiUrl} authReturn={authReturn} mode={mode} />
          </Suspense>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
