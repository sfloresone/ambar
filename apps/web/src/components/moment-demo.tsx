import { EASE } from "@ambar/ui/lib/motion";
import { CopyButton } from "@ambar/ui/components/copy-button";
import { SaveToggle } from "@ambar/ui/components/save-toggle";
import { SegmentedControl } from "@ambar/ui/components/segmented-control";
import { Switch } from "@ambar/ui/components/switch";
import { cn } from "@ambar/ui/lib/utils";
import { LinkSimpleIcon, LockSimpleIcon, PlayIcon, UsersIcon } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState, type ReactNode } from "react";


type Kind = "Photo" | "Clip" | "Link";

const KINDS: Kind[] = ["Photo", "Clip", "Link"];

function isKind(value: string): value is Kind {
  return KINDS.some((kind) => kind === value);
}

type MomentDemoProps = {
  photoSrc: string;
  clipPosterSrc: string;
};

/** Landing demo: every control is the real one from @ambar/ui. Nothing is sent anywhere. */
export function MomentDemo({ photoSrc, clipPosterSrc }: MomentDemoProps) {
  const [kind, setKind] = useState<Kind>("Photo");
  const [kept, setKept] = useState(false);
  const [shared, setShared] = useState(false);

  function changeKind(value: string) {
    if (isKind(value)) {
      setKind(value);
    }
  }

  return (
    <div className="grid gap-6 rounded-3xl border bg-card p-4 sm:p-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] md:gap-10">
      <div className="flex flex-col gap-6">
        <Step number={1} title="Choose what to keep">
          <SegmentedControl options={KINDS} label="Kind of moment" defaultValue="Photo" onValueChange={changeKind} />
        </Step>
        <Step number={2} title="Keep it">
          <SaveToggle onSavedChange={setKept} />
        </Step>
        <Step number={3} title="Decide who sees it">
          <Switch label="Shared" onCheckedChange={setShared} />
        </Step>
      </div>

      <article className="flex flex-col gap-4 rounded-2xl border bg-background p-3">
        <MomentMedia kind={kind} photoSrc={photoSrc} clipPosterSrc={clipPosterSrc} />
        <div className="flex flex-wrap items-center justify-between gap-3 px-1 pb-1">
          <div className="flex flex-col">
            <h3 className="text-lg">Under the ash tree</h3>
            <span aria-live="polite" className="flex items-center gap-1.5 text-sm text-muted-foreground">
              {shared ? <UsersIcon weight="bold" aria-hidden /> : <LockSimpleIcon weight="bold" aria-hidden />}
              {kept ? "Kept" : "Not kept yet"} · {shared ? "Shared" : "Only you"}
            </span>
          </div>
          <div className={cn("transition-opacity duration-300 motion-reduce:transition-none", !shared && "invisible opacity-0")}>
            <CopyButton value="https://ambar.page/m/under-the-ash-tree" />
          </div>
        </div>
      </article>
    </div>
  );
}

type StepProps = {
  number: number;
  title: string;
  children: ReactNode;
};

function Step({ number, title, children }: StepProps) {
  return (
    <div className="flex flex-col items-start gap-3">
      <span className="flex items-center gap-2 text-sm font-medium">
        <span aria-hidden className="grid size-6 place-items-center rounded-full bg-sky text-xs text-ink">
          {number}
        </span>
        {title}
      </span>
      {children}
    </div>
  );
}

type MomentMediaProps = {
  kind: Kind;
  photoSrc: string;
  clipPosterSrc: string;
};

function MomentMedia({ kind, photoSrc, clipPosterSrc }: MomentMediaProps) {
  const reduceMotion = useReducedMotion() === true;

  return (
    <div className="relative aspect-4/3 overflow-hidden rounded-xl">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={kind}
          className="absolute inset-0"
          initial={reduceMotion ? false : { opacity: 0, transform: "scale(0.97)" }}
          animate={{ opacity: 1, transform: "scale(1)" }}
          exit={reduceMotion ? undefined : { opacity: 0, transform: "scale(0.97)" }}
          transition={{ duration: 0.22, ease: EASE.outSoft }}
        >
          {kind === "Link" ? (
            <div className="flex size-full flex-col justify-end gap-2 bg-muted p-5">
              <LinkSimpleIcon weight="bold" aria-hidden className="size-6 text-leaf" />
              <span className="font-heading text-xl font-bold text-balance">How to look up more often</span>
              <span className="text-sm text-muted-foreground">example.com/look-up</span>
            </div>
          ) : (
            <>
              <img
                src={kind === "Clip" ? clipPosterSrc : photoSrc}
                alt="Looking up at the sky through ash tree leaves"
                loading="lazy"
                decoding="async"
                className="size-full object-cover"
              />
              {kind === "Clip" && (
                <span className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-ink/80 px-2.5 py-1 text-xs font-medium text-cloud">
                  <PlayIcon weight="fill" aria-hidden />
                  0:12
                </span>
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
