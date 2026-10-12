// Sign in and sign up, one flow for every surface (the landing dialog, the app's /login).
//
// Sign in: email → code (or the email link). Sign up: the moment first ("It all starts with a moment.",
// optional: "Skip for now"), then email → code. The backend flow is the same (asking for a code never
// reveals whether an account exists); verifying says whether the account was just created, and the
// ending welcomes accordingly. A link under the form switches modes: the Shutter closes over the whole
// surface, the panes trade places and the words change behind it, and it opens again.
//
// Darkroom "develop": the sign-up title develops word by word, a faint photo develops behind it, and the
// moment then develops on the card of the keep flow.
import type { SignedIn } from "@ambar/core";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Fragment, useRef, useState, type ComponentType, type ReactNode } from "react";

import { DEVELOP_FROM, DEVELOP_TO, EASE } from "../lib/motion.ts";
import { wait } from "../lib/wait.ts";
import { KeepFlow, type AuthMode, type TitleProps } from "../screens/keep-flow/keep-flow.tsx";
import { Dropzone } from "./dropzone.tsx";
import { FlowLogo } from "./flow-logo.tsx";
import { FlowSplit } from "./flow-split.tsx";
import { useIrisExit } from "./iris.tsx";
import { SHUTTER_OPEN_MS } from "./shutter.tsx";

export type { AuthMode } from "../screens/keep-flow/keep-flow.tsx";

const TITLE = ["It", "all", "starts", "with", "a", "moment."];

const TITLE_DELAY_S = 0.25;

const WORD_STAGGER_S = 0.14;

const WORD_DURATION_S = 1.6;

const AFTER_TITLE_S = TITLE_DELAY_S + TITLE.length * WORD_STAGGER_S + 0.6;

const BACKDROP_OPACITY = 0.32;

/** Fully closed, the new mode paints behind the shutter before it opens. */
const SWITCH_HOLD_MS = 120;

type DescriptionProps = {
  className?: string;
  children: ReactNode;
};

function DefaultDescription(props: DescriptionProps) {
  return <p {...props} />;
}

export type AuthFlowProps = {
  initialMode?: AuthMode;
  /** Real API base URL; unset = mock clients. */
  apiUrl?: string;
  /** Token from the email link (?verify=…): skip the drop and finish signing in. */
  verifyToken?: string;
  /** The page the email link should open: this one, so it finds the moment saved here. */
  returnTo?: string;
  /** Faint photo that develops behind the sign-up title. */
  backdropSrc?: string;
  /** Heading and description elements. The landing dialog passes Base UI's so the dialog stays named. */
  Title?: ComponentType<TitleProps>;
  Description?: ComponentType<DescriptionProps>;
  /** The flow ended signed in (before the iris closes), e.g. to refresh the session meanwhile. */
  onSignedIn?: (signedIn: SignedIn) => void;
  /** The iris has closed: go to the app. */
  onExit: () => void;
};

export function AuthFlow({ initialMode = "sign-up", apiUrl, verifyToken, returnTo, backdropSrc, Title, Description = DefaultDescription, onSignedIn, onExit }: AuthFlowProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [file, setFile] = useState<File | null>(null);
  const [skipped, setSkipped] = useState(false);
  const [switching, setSwitching] = useState(false);
  const content = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion() === true;
  // Signed in: the iris closes onto the logo of the flow, then the caller hands off to the app.
  const { logoRef, close, iris } = useIrisExit(onExit);
  const dropping = mode === "sign-up" && file === null && !skipped && verifyToken === undefined;

  async function switchMode() {
    const next: AuthMode = mode === "sign-in" ? "sign-up" : "sign-in";

    if (!reduceMotion) {
      setSwitching(true);
      await wait(SHUTTER_OPEN_MS);
    }

    setMode(next);
    setSkipped(false);

    if (!reduceMotion) {
      await wait(SWITCH_HOLD_MS);
      setSwitching(false);
    }

    // The link that had focus is gone: land on the new heading, so screen readers hear the new mode.
    requestAnimationFrame(() => content.current?.querySelector<HTMLElement>("h1, h2")?.focus());
  }

  const modeSwitch = <ModeSwitch mode={mode} onSwitch={switchMode} disabled={switching} />;

  return (
    <FlowSplit
      mediaSide={mode === "sign-in" ? "left" : "right"}
      switching={switching}
      backdrop={
        <AnimatePresence>
          {dropping && backdropSrc !== undefined && <Backdrop key="backdrop" src={backdropSrc} reduceMotion={reduceMotion} />}
        </AnimatePresence>
      }
    >
      {iris}
      <div ref={content}>
        <AnimatePresence mode="wait">
          {dropping ? (
            <motion.div
              key="drop"
              className="flex flex-col gap-8"
              exit={reduceMotion ? undefined : { opacity: 0, transform: "translateY(-8px)" }}
              transition={{ duration: 0.12, ease: EASE.outSoft }}
            >
              <DropStep Title={Title} Description={Description} reduceMotion={reduceMotion} onFile={setFile} onSkip={() => setSkipped(true)} />
              {modeSwitch}
            </motion.div>
          ) : (
            <motion.div key="flow" initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
              {/* The logo the iris will close onto when the flow ends. */}
              <FlowLogo ref={logoRef} />
              <KeepFlow
                mode={mode}
                file={file}
                apiUrl={apiUrl}
                verifyToken={verifyToken}
                returnTo={returnTo}
                Title={Title}
                emailFooter={modeSwitch}
                onDone={(signedIn) => {
                  onSignedIn?.(signedIn);
                  close();
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </FlowSplit>
  );
}

type ModeSwitchProps = {
  mode: AuthMode;
  onSwitch: () => void;
  disabled: boolean;
};

function ModeSwitch({ mode, onSwitch, disabled }: ModeSwitchProps) {
  return (
    <p className="text-sm text-muted-foreground">
      {mode === "sign-in" ? "New to Ambar? " : "Already have an account? "}
      <button
        type="button"
        onClick={onSwitch}
        disabled={disabled}
        className="rounded-sm font-medium text-link underline-offset-4 outline-hidden hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-ring disabled:cursor-wait"
      >
        {mode === "sign-in" ? "Create an account" : "Sign in"}
      </button>
    </p>
  );
}

type DropStepProps = {
  Title?: ComponentType<TitleProps>;
  Description: ComponentType<DescriptionProps>;
  reduceMotion: boolean;
  onFile: (file: File) => void;
  onSkip: () => void;
};

function DefaultHeading({ ref, children, ...props }: TitleProps) {
  return (
    <h1 ref={ref} {...props}>
      {children}
    </h1>
  );
}

/** Sign up starts with the moment: title develops word by word, then the dropzone. Optional. */
function DropStep({ Title = DefaultHeading, Description, reduceMotion, onFile, onSkip }: DropStepProps) {
  return (
    <>
      <div className="relative flex flex-col gap-3">
        <Title tabIndex={-1} className="text-4xl tracking-tight text-balance outline-hidden sm:text-5xl">
          {TITLE.map((word, index) => (
            // The space sits between the words, not inside them: a trailing space inside an inline-block
            // collapses, which glued the words together.
            <Fragment key={word}>
              {index > 0 && " "}
              <motion.span
                className="inline-block"
                initial={reduceMotion ? false : { opacity: 0, filter: DEVELOP_FROM }}
                animate={{ opacity: 1, filter: DEVELOP_TO }}
                transition={{ duration: WORD_DURATION_S, ease: EASE.develop, delay: TITLE_DELAY_S + index * WORD_STAGGER_S }}
              >
                {word}
              </motion.span>
            </Fragment>
          ))}
        </Title>
        <motion.div
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, ease: EASE.develop, delay: AFTER_TITLE_S }}
        >
          <Description className="max-w-md text-pretty text-muted-foreground">
            Drop a photo or a short clip. Ambar keeps it, and it will still be there when you look.
          </Description>
        </motion.div>
      </div>
      <motion.div
        className="relative flex flex-col gap-3"
        initial={reduceMotion ? false : { opacity: 0, transform: "translateY(16px)" }}
        animate={{ opacity: 1, transform: "translateY(0px)" }}
        transition={{ duration: 0.9, ease: EASE.develop, delay: AFTER_TITLE_S + 0.25 }}
      >
        <Dropzone onFileAccepted={onFile} />
        <button
          type="button"
          onClick={onSkip}
          className="w-fit rounded-sm text-sm text-muted-foreground underline-offset-4 outline-hidden hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-ring"
        >
          Skip for now
        </button>
      </motion.div>
    </>
  );
}

type BackdropProps = {
  src: string;
  reduceMotion: boolean;
};

/** Develops only once loaded, so a slow network never "develops" an empty box. */
function Backdrop({ src, reduceMotion }: BackdropProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <motion.img
      src={src}
      alt=""
      aria-hidden
      decoding="async"
      onLoad={() => setLoaded(true)}
      // Top of the flow pane, bleeding to its edges, fading out before the description for legibility.
      className="pointer-events-none absolute inset-x-0 top-0 h-48 w-full max-w-none object-cover [mask-image:linear-gradient(to_bottom,black_20%,transparent)] sm:h-52"
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, filter: DEVELOP_FROM }}
      animate={loaded ? { opacity: BACKDROP_OPACITY, filter: DEVELOP_TO } : undefined}
      exit={{ opacity: 0, transition: { duration: 0.12, ease: EASE.outSoft } }}
      transition={reduceMotion ? { duration: 0 } : { duration: 2.4, ease: EASE.develop }}
    />
  );
}
