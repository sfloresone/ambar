import { AuthError, type CodeRequest } from "@ambar/core";
import { useEffect, useId, useState } from "react";

import { Button, buttonVariants } from "../../components/button.tsx";
import { CodeInput } from "../../components/code-input.tsx";
import { mailAppFor } from "../../lib/mail-apps.ts";

type CodeStepProps = {
  request: CodeRequest;
  onVerify: (code: string) => Promise<void>;
  onResend: () => Promise<CodeRequest>;
  onChangeEmail: () => void;
};

export function CodeStep({ request, onVerify, onResend, onChangeEmail }: CodeStepProps) {
  const errorId = useId();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [resendAt, setResendAt] = useState(() => Date.now() + request.resendAfterMs);
  const secondsLeft = useSecondsUntil(resendAt);
  const mailApp = mailAppFor(request.email);

  async function verify(next: string) {
    setBusy(true);
    setError("");

    try {
      await onVerify(next);
    } catch (cause) {
      setError(cause instanceof AuthError ? cause.message : "We couldn't check the code. Check your connection and try again.");
      setCode("");
      setBusy(false);
    }
  }

  async function resend() {
    setNotice("");

    try {
      const next = await onResend();

      setResendAt(Date.now() + next.resendAfterMs);
      setNotice(`New code sent to ${next.email}.`);
    } catch (cause) {
      setError(cause instanceof AuthError ? cause.message : "We couldn't send a new code. Try again in a moment.");
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <CodeInput
          value={code}
          onChange={(next) => {
            setCode(next);
            setError("");
          }}
          onComplete={verify}
          label={`6-digit code sent to ${request.email}`}
          invalid={error !== ""}
          busy={busy}
          describedBy={error === "" ? undefined : errorId}
        />
        <p id={errorId} aria-live="polite" className="min-h-5 text-sm font-medium text-destructive">
          {busy ? "" : error}
        </p>
        <p aria-live="polite" className="sr-only">
          {busy ? "Checking the code…" : notice}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {mailApp !== null && (
          <a href={mailApp.href} target="_blank" rel="noreferrer" className={buttonVariants({ tone: "cloud" })}>
            {mailApp.label}
          </a>
        )}
        <Button tone="cloud" onClick={resend} disabled={secondsLeft > 0}>
          {secondsLeft > 0 ? `Resend in ${secondsLeft}s` : "Resend code"}
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

/** Whole seconds until `target`, ticking every second; 0 once it has passed. */
function useSecondsUntil(target: number): number {
  const [now, setNow] = useState(() => Date.now());

  // One timeout per tick, until the target passes.
  useEffect(() => {
    if (now >= target) {
      return;
    }

    const timer = setTimeout(() => setNow(Date.now()), 1000);

    return () => clearTimeout(timer);
  }, [now, target]);

  return Math.max(0, Math.ceil((target - now) / 1000));
}
