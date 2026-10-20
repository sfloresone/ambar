// What Ambar found: the best match, large, already on the clipboard; why it matched; a few others.
// Copy, download or open in one tap. If the browser blocked the automatic copy, Copy is the obvious
// next step.
import { momentLabel, type AskResult, type Moment } from "@ambar/core";
import { ArrowSquareOutIcon, CheckIcon, CopyIcon, DownloadSimpleIcon, XIcon } from "@phosphor-icons/react";

import { useRef, useState } from "react";

import { Button } from "../../components/button.tsx";
import { usePlatformActions, type Copied } from "../../lib/platform-actions.ts";
import { cn } from "../../lib/utils.ts";
import { useLibrary } from "./library-context.tsx";
import { useMomentActions } from "./moment-actions.tsx";
import { MomentCard } from "./moment-card.tsx";

export type AnswerState =
  | { status: "thinking"; query: string }
  | { status: "done"; query: string; result: AskResult; copied: Copied | "failed" | null };

/**
 * Asking Ambar (the agent): the answer, and its best match copied right away. Only ever called on purpose
 * (the palette's "Ask Ambar" row), never while searching: searches stay local and free.
 */
export function useAsk() {
  const library = useLibrary();
  const platform = usePlatformActions();
  const [answer, setAnswer] = useState<AnswerState | null>(null);
  /** Only the latest question may write its answer. */
  const latest = useRef(0);

  async function ask(query: string) {
    const id = ++latest.current;

    setAnswer({ status: "thinking", query });

    const result = await library.ask(query);
    let copied: Copied | "failed" | null = null;

    if (result.best !== null) {
      copied = await platform.copy(result.best).catch(() => "failed" as const);
    }

    if (id === latest.current) {
      setAnswer({ status: "done", query, result, copied });
    }
  }

  function dismiss() {
    latest.current += 1;
    setAnswer(null);
  }

  return { answer, ask, dismiss };
}

type AnswerPanelProps = {
  answer: AnswerState;
  /** The answer comes from the simulated agent (mock data). */
  simulated: boolean;
  onOpen: (moment: Moment) => void;
  onDismiss: () => void;
};

export function AnswerPanel({ answer, simulated, onOpen, onDismiss }: AnswerPanelProps) {
  return (
    <section aria-label="Ambar's answer" aria-busy={answer.status === "thinking"} className="@container flex flex-col gap-5 rounded-3xl border bg-card p-5 shadow-[0_1px_2px_rgb(20_20_20/0.05),0_12px_32px_rgb(20_20_20/0.06)]">
      <header className="flex items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="text-sm text-muted-foreground">
            “{answer.query}”{simulated && <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs">Simulated</span>}
          </p>
          <h2 aria-live="polite" className="text-xl tracking-tight">
            {answer.status === "thinking" ? "Looking through your moments…" : answer.result.best === null ? "Nothing matched" : "Here's what I found"}
          </h2>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Close the answer"
          className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground outline-hidden hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-ring"
        >
          <XIcon weight="bold" aria-hidden className="size-4" />
        </button>
      </header>

      {answer.status === "thinking" && <Thinking />}

      {answer.status === "done" && answer.result.best === null && (
        <p className="text-pretty text-muted-foreground">Try other words, or a time, like “last April” or “a week ago”.</p>
      )}

      {answer.status === "done" && answer.result.best !== null && (
        // Wide: the best match on the left, spanning; actions then alternatives on the right.
        // Narrow (phone, extension popup): what was copied and the actions first, then the match, then others.
        <div className="grid gap-5 @2xl:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] @2xl:grid-rows-[auto_1fr]">
          <MomentCard moment={answer.result.best} onOpen={onOpen} size="feature" className="w-full max-w-80 @max-2xl:mx-auto @2xl:row-span-2" />
          <div className="flex flex-col gap-5 @max-2xl:order-first">
            <p className="text-sm text-muted-foreground">{answer.result.reason}</p>
            <BestActions moment={answer.result.best} copied={answer.copied} onOpen={onOpen} />
          </div>
          {answer.result.alternatives.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">Also close</p>
              <ul className="grid grid-cols-2 gap-3 @lg:grid-cols-4">
                {answer.result.alternatives.map((moment) => (
                  <li key={moment.id}>
                    <MomentCard moment={moment} onOpen={onOpen} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function BestActions({ moment, copied, onOpen }: { moment: Moment; copied: Copied | "failed" | null; onOpen: (moment: Moment) => void }) {
  const actions = useMomentActions(moment);
  const blocked = copied === "failed";

  return (
    <div className="flex flex-col gap-3">
      <p aria-live="polite" className={cn("flex items-center gap-1.5 text-sm font-medium", blocked ? "text-foreground" : "text-leaf")}>
        {copied === "image" || copied === "link" ? (
          <>
            <CheckIcon weight="bold" aria-hidden className="size-4" />
            {copied === "image" ? "Image copied. Paste it anywhere." : "Link copied. Paste it anywhere."}
          </>
        ) : blocked ? (
          "Your browser needs a tap to copy it."
        ) : null}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button tone={blocked ? "ink" : "cloud"} size="md" onClick={() => actions.copy()}>
          <CopyIcon weight="bold" aria-hidden />
          Copy
        </Button>
        {actions.download !== undefined && (
          <Button tone="cloud" size="md" onClick={actions.download}>
            <DownloadSimpleIcon weight="bold" aria-hidden />
            Download
          </Button>
        )}
        <Button tone="cloud" size="md" onClick={actions.open}>
          <ArrowSquareOutIcon weight="bold" aria-hidden />
          {moment.kind === "link" ? "Open link" : "Open"}
        </Button>
        <Button tone="cloud" size="md" onClick={() => onOpen(moment)} aria-label={`Details of ${momentLabel(moment)}`}>
          Details
        </Button>
      </div>
    </div>
  );
}

/** Develop-style placeholders while the agent looks. */
function Thinking() {
  return (
    <div aria-hidden className="grid gap-5 @2xl:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
      <div className="aspect-4/5 animate-pulse rounded-2xl bg-muted motion-reduce:animate-none" />
      <div className="flex flex-col gap-3">
        <div className="h-4 w-2/3 animate-pulse rounded-full bg-muted motion-reduce:animate-none" />
        <div className="h-10 w-1/2 animate-pulse rounded-full bg-muted motion-reduce:animate-none" />
      </div>
    </div>
  );
}
