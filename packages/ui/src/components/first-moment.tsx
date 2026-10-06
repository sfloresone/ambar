// Content of the onboarding dialog. Loaded lazily by FirstMomentDialog: Motion and the dropzone only
// download when someone opens (or is about to open) it.
//
// Darkroom "develop": things appear like a print in the tray, from overexposed white, flat and soft to
// full contrast and sharp. The title develops word by word, a faint photo develops behind it, and the
// moment then develops on the card of the keep flow, which signs the user up or in.
import { Dialog } from "@base-ui/react/dialog";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";

import { DEVELOP_FROM, DEVELOP_TO, EASE } from "../lib/motion.ts";
import { KeepFlow } from "../screens/keep-flow/keep-flow.tsx";
import { Dropzone } from "./dropzone.tsx";
import { FlowLogo } from "./flow-logo.tsx";
import { useIrisExit, withIrisEntry } from "./iris.tsx";

/** keep: drop a moment first (Start keeping). sign-in: straight to email and code (Sign in). */
export type OnboardingMode = "keep" | "sign-in";


const TITLE = ["It", "all", "starts", "with", "a", "moment."];





const TITLE_DELAY_S = 0.25;

const WORD_STAGGER_S = 0.14;

const WORD_DURATION_S = 1.6;

const AFTER_TITLE_S = TITLE_DELAY_S + TITLE.length * WORD_STAGGER_S + 0.6;

const BACKDROP_OPACITY = 0.32;

export type FirstMomentProps = {
  continueHref: string;
  /** Faint photo that develops behind the title. */
  backdropSrc?: string;
  /** Real API base URL; unset = mock clients. */
  apiUrl?: string;
  /** Token from the email link (?verify=…): skip the drop and finish signing in. */
  verifyToken?: string;
  mode?: OnboardingMode;
};

export default function FirstMoment({ continueHref, backdropSrc, apiUrl, verifyToken, mode = "keep" }: FirstMomentProps) {
  const [file, setFile] = useState<File | null>(null);
  const inFlow = mode === "sign-in" || file !== null || verifyToken !== undefined;
  // Signed in and kept: the iris closes onto the logo of the flow, then hands off to the app (which opens it).
  const { logoRef, close, iris } = useIrisExit(() => window.location.assign(withIrisEntry(continueHref)));

  const reduceMotion = useReducedMotion() === true;

  return (
    <div className="relative">
      {iris}
      <AnimatePresence mode="wait">
        {!inFlow ? (
          <motion.div
            key="drop"
            className="flex flex-col gap-8"
            exit={reduceMotion ? undefined : { opacity: 0, transform: "translateY(-8px)" }}
            transition={{ duration: 0.12, ease: EASE.outSoft }}
          >
            {backdropSrc !== undefined && <Backdrop src={backdropSrc} reduceMotion={reduceMotion} />}
            <div className="relative flex flex-col gap-3">
              <Dialog.Title className="text-4xl tracking-tight text-balance sm:text-5xl">
                {TITLE.map((word, index) => (
                  <motion.span
                    key={word}
                    className="inline-block"
                    initial={reduceMotion ? false : { opacity: 0, filter: DEVELOP_FROM }}
                    animate={{ opacity: 1, filter: DEVELOP_TO }}
                    transition={{ duration: WORD_DURATION_S, ease: EASE.develop, delay: TITLE_DELAY_S + index * WORD_STAGGER_S }}
                  >
                    {word}
                    {index < TITLE.length - 1 ? " " : ""}
                  </motion.span>
                ))}
              </Dialog.Title>
              <motion.div
                initial={reduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, ease: EASE.develop, delay: AFTER_TITLE_S }}
              >
                <Dialog.Description className="max-w-md text-pretty text-muted-foreground">
                  Drop a photo or a short clip. Ámbar keeps it, and it will still be there when you look.
                </Dialog.Description>
              </motion.div>
            </div>
            <motion.div
              className="relative"
              initial={reduceMotion ? false : { opacity: 0, transform: "translateY(16px)" }}
              animate={{ opacity: 1, transform: "translateY(0px)" }}
              transition={{ duration: 0.9, ease: EASE.develop, delay: AFTER_TITLE_S + 0.25 }}
            >
              <Dropzone onFileAccepted={setFile} />
            </motion.div>
          </motion.div>
        ) : (
          <motion.div key="flow" initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            {/* The logo the iris will close onto when the flow ends. */}
            <FlowLogo ref={logoRef} />
            <KeepFlow file={file} apiUrl={apiUrl} verifyToken={verifyToken} Title={Dialog.Title} onDone={close} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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
      // Bleeds to the popup edges (p-6 / sm:p-10) and fades out before the description, for legibility.
      className="pointer-events-none absolute -inset-x-6 -top-6 h-48 w-[calc(100%+3rem)] max-w-none object-cover [mask-image:linear-gradient(to_bottom,black_20%,transparent)] sm:-inset-x-10 sm:-top-10 sm:h-52 sm:w-[calc(100%+5rem)]"
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, filter: DEVELOP_FROM }}
      animate={loaded ? { opacity: BACKDROP_OPACITY, filter: DEVELOP_TO } : undefined}
      transition={reduceMotion ? { duration: 0 } : { duration: 2.4, ease: EASE.develop }}
    />
  );
}
