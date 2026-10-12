// "Start keeping" onboarding. Base UI Dialog handles focus trap, Escape and returning focus to the trigger.
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
   * The page that handles the email link (?verify=…). Exactly one dialog per page should set it, so the
   * link reopens one dialog, not every "Start keeping" button.
   */
  handlesVerifyLink?: boolean;
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
  handlesVerifyLink = false,
  mode = "sign-up",
  className,
  label = mode === "sign-in" ? "Sign in" : "Start keeping",
  tone = "ink",
  size = "lg",
}: FirstMomentDialogProps) {
  const warm = () => preload(backdropSrc);
  const [open, setOpen] = useState(false);
  const [verifyToken, setVerifyToken] = useState<string | undefined>(undefined);

  // The email link lands here with ?verify=…: reopen the flow to finish signing in, then clean the URL.
  // An effect on purpose: the URL only exists in the browser, not while Astro renders the island.
  useEffect(() => {
    if (!handlesVerifyLink) {
      return;
    }

    const url = new URL(window.location.href);
    const token = url.searchParams.get("verify");

    if (token === null) {
      return;
    }

    url.searchParams.delete("verify");
    window.history.replaceState(null, "", url);
    // oxlint-disable-next-line react/set-state-in-effect -- syncing from the URL, which only exists in the browser.
    setVerifyToken(token);
    setOpen(true);
  }, [handlesVerifyLink]);

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
            <OnboardingContent continueHref={continueHref} backdropSrc={backdropSrc} apiUrl={apiUrl} verifyToken={verifyToken} mode={mode} />
          </Suspense>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
