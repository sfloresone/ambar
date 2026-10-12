import { AuthError, type CodeRequest } from "@ambar/core";
import { useId, useRef, useState } from "react";

import { Button, buttonVariants } from "../../components/button.tsx";
import { CodeInput } from "../../components/code-input.tsx";
import { formatWait, useSecondsUntil } from "../../lib/countdown.ts";
import { mailAppFor } from "../../lib/mail-apps.ts";

type CodeStepProps = {
  request: CodeRequest;
  onVerify: (code: string) => Promise<void>;
  onResend: () => Promise<CodeRequest>;
  onChangeEmail: () => void;
};

/**
 * The code is dead (too many wrong tries, expired or used): typing is pointless until a new one arrives.
 * Rate limited: new codes are paused until `until`.
 */
type Block = { kind: "dead"; message: string } | { kind: "paused"; until: number } | null;

function wrongCodeMessage(cause: AuthError): string {
  if (cause.attemptsLeft === undefined) {
    return cause.message;
  }

  return cause.attemptsLeft === 1 ? "That code didn't work. 1 try left." : `That code didn't work. ${cause.attemptsLeft} tries left.`;
}

export function CodeStep({ request, onVerify, onResend, onChangeEmail }: CodeStepProps) {
  const errorId = useId();
  const resendButton = useRef<HTMLButtonElement>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [block, setBlock] = useState<Block>(null);
  // Bumped when a new code replaces a dead one: the input remounts and takes focus (autoFocus) again.
  const [inputKey, setInputKey] = useState(0);
  const [resendAt, setResendAt] = useState(() => Date.now() + request.resendAfterMs);
  const pausedUntil = block?.kind === "paused" ? block.until : 0;
  const pauseLeft = useSecondsUntil(pausedUntil);
  const cooldownLeft = useSecondsUntil(resendAt);
  const dead = block?.kind === "dead";
  // A dead code has no cooldown: the server sends a fresh one right away (the hourly cap still applies).
  const waitLeft = dead ? 0 : Math.max(pauseLeft, cooldownLeft);
  const mailApp = mailAppFor(request.email);

  async function verify(next: string) {
    setBusy(true);
    setError("");

    try {
      await onVerify(next);
    } catch (cause) {
      setCode("");
      setBusy(false);

      if (cause instanceof AuthError && (cause.code === "too-many-attempts" || cause.code === "expired-code")) {
        setBlock({ kind: "dead", message: cause.code === "too-many-attempts" ? "Too many wrong codes. Get a new one to keep going." : "That code has expired. Get a new one to keep going." });
        // The input is disabled now: move focus to the way forward.
        requestAnimationFrame(() => resendButton.current?.focus());

        return;
      }

      setError(cause instanceof AuthError ? wrongCodeMessage(cause) : "We couldn't check the code. Check your connection and try again.");
    }
  }

  async function resend() {
    setNotice("");
    setError("");

    try {
      const next = await onResend();

      if (dead) {
        setInputKey((key) => key + 1);
      }

      setBlock(null);
      setResendAt(Date.now() + next.resendAfterMs);
      setNotice(`New code sent to ${next.email}.`);
    } catch (cause) {
      if (cause instanceof AuthError && cause.code === "rate-limited" && cause.retryAfterMs !== undefined) {
        setBlock({ kind: "paused", until: Date.now() + cause.retryAfterMs });

        return;
      }

      setError(cause instanceof AuthError ? cause.message : "We couldn't send a new code. Try again in a moment.");
    }
  }

  const message = block?.kind === "dead" ? block.message : pauseLeft > 0 ? `You've asked for a lot of codes. You can get another in ${formatWait(pauseLeft)}.` : error;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <CodeInput
          key={inputKey}
          value={code}
          onChange={(next) => {
            setCode(next);
            setError("");
          }}
          onComplete={verify}
          label={`6-digit code sent to ${request.email}`}
          invalid={error !== "" || dead}
          busy={busy}
          disabled={dead}
          describedBy={message === "" ? undefined : errorId}
        />
        <p id={errorId} aria-live="polite" className="min-h-5 text-sm font-medium text-destructive">
          {busy ? "" : message}
        </p>
        <p aria-live="polite" className="sr-only">
          {busy ? "Checking the code…" : notice}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {mailApp !== null && !dead && (
          <a href={mailApp.href} target="_blank" rel="noreferrer" className={buttonVariants({ tone: "cloud" })}>
            {mailApp.label}
          </a>
        )}
        <Button ref={resendButton} tone={dead ? "ink" : "cloud"} onClick={resend} disabled={waitLeft > 0}>
          {waitLeft > 0 ? `New code in ${formatWait(waitLeft)}` : dead ? "Get a new code" : "Resend code"}
        </Button>
      </div>
      <button
        type="button"
        onClick={onChangeEmail}
        className="w-fit rounded-sm text-sm text-muted-foreground underline-offset-4 outline-hidden hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-ring"
      >
        Use a different email
      </button>
    </div>
  );
}
