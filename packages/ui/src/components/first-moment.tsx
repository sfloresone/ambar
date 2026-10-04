// Content of the onboarding dialog. Loaded lazily by FirstMomentDialog: Motion and the dropzone only
// download when someone opens it.
import { Dialog } from "@base-ui/react/dialog";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

import { Button, buttonVariants } from "./button.tsx";
import { Dropzone } from "./dropzone.tsx";

const TITLE = ["It", "all", "starts", "with", "a", "moment."];

// Film-title ease: fast start, long soft landing.
const EASE = [0.22, 1, 0.36, 1] as const;

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

const WORD_STAGGER_S = 0.16;

const AFTER_TITLE_S = TITLE.length * WORD_STAGGER_S + 0.5;

type FirstMomentProps = {
  continueHref: string;
};

export default function FirstMoment({ continueHref }: FirstMomentProps) {
  const [file, setFile] = useState<File | null>(null);
  const reduceMotion = useReducedMotion() === true;

  return (
    <AnimatePresence mode="wait" initial={false}>
      {file === null ? (
        <motion.div
          key="drop"
          className="flex flex-col gap-8"
          exit={reduceMotion ? undefined : { opacity: 0, transform: "translateY(-8px)" }}
          transition={{ duration: 0.2, ease: EASE_OUT }}
        >
          <div className="flex flex-col gap-3">
            <Dialog.Title className="text-4xl tracking-tight text-balance sm:text-5xl">
              {TITLE.map((word, index) => (
                <motion.span
                  key={word}
                  className="inline-block"
                  initial={reduceMotion ? false : { opacity: 0, transform: "translateY(14px)", filter: "blur(12px)" }}
                  animate={{ opacity: 1, transform: "translateY(0px)", filter: "blur(0px)" }}
                  transition={{ duration: 1.1, ease: EASE, delay: index * WORD_STAGGER_S }}
                >
                  {word}
                  {index < TITLE.length - 1 ? " " : ""}
                </motion.span>
              ))}
            </Dialog.Title>
            <motion.div
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, ease: EASE, delay: AFTER_TITLE_S }}
            >
              <Dialog.Description className="max-w-md text-pretty text-muted-foreground">
                Drop a photo or a short clip. Ámbar keeps it, and it will still be there when you look.
              </Dialog.Description>
            </motion.div>
          </div>
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, transform: "translateY(16px)" }}
            animate={{ opacity: 1, transform: "translateY(0px)" }}
            transition={{ duration: 0.9, ease: EASE, delay: AFTER_TITLE_S + 0.25 }}
          >
            <Dropzone onFileAccepted={setFile} />
          </motion.div>
        </motion.div>
      ) : (
        <Kept
          key="kept"
          file={file}
          continueHref={continueHref}
          onReset={() => setFile(null)}
          reduceMotion={reduceMotion}
        />
      )}
    </AnimatePresence>
  );
}

type KeptProps = {
  file: File;
  continueHref: string;
  onReset: () => void;
  reduceMotion: boolean;
};

function Kept({ file, continueHref, onReset, reduceMotion }: KeptProps) {
  const [url, setUrl] = useState<string | null>(null);
  const isClip = file.type.startsWith("video/");

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);

    setUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  return (
    <motion.div
      className="flex flex-col gap-6"
      initial={reduceMotion ? false : { opacity: 0, transform: "scale(0.98)", filter: "blur(8px)" }}
      animate={{ opacity: 1, transform: "scale(1)", filter: "blur(0px)" }}
      transition={{ duration: 0.9, ease: EASE }}
    >
      <div className="flex flex-col gap-2">
        <Dialog.Title className="text-4xl tracking-tight sm:text-5xl">Kept.</Dialog.Title>
        <Dialog.Description className="text-muted-foreground">
          It will be here when you look. Sign in to keep it on every device.
        </Dialog.Description>
      </div>
      {url !== null &&
        (isClip ? (
          <video src={url} controls muted playsInline className="aspect-4/3 w-full rounded-2xl bg-muted object-cover" />
        ) : (
          <img src={url} alt={`Your moment: ${file.name}`} className="aspect-4/3 w-full rounded-2xl bg-muted object-cover" />
        ))}
      <div className="flex flex-wrap gap-3">
        <a href={continueHref} className={buttonVariants({ size: "lg" })}>
          Continue to Ámbar
        </a>
        <Button tone="cloud" size="lg" onClick={onReset}>
          Keep another
        </Button>
      </div>
    </motion.div>
  );
}
