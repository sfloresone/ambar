import { AuthError, isValidEmail } from "@ambar/core";
import { useId, useState, type FormEvent } from "react";

import { Button } from "../../components/button.tsx";
import { Input } from "../../components/input.tsx";
import { Label } from "../../components/label.tsx";
import { formatWait, useSecondsUntil } from "../../lib/countdown.ts";

type EmailStepProps = {
  defaultEmail: string;
  onSubmit: (email: string) => Promise<void>;
};

export function EmailStep({ defaultEmail, onSubmit }: EmailStepProps) {
  const inputId = useId();
  const errorId = useId();
  const [email, setEmail] = useState(defaultEmail);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  // Rate limited: sending is paused until then (epoch ms).
  const [pausedUntil, setPausedUntil] = useState(0);
  const pauseLeft = useSecondsUntil(pausedUntil);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isValidEmail(email)) {
      setError("That doesn't look like an email address.");

      return;
    }

    setBusy(true);
    setError("");

    try {
      await onSubmit(email);
    } catch (cause) {
      setBusy(false);

      if (cause instanceof AuthError && cause.code === "rate-limited" && cause.retryAfterMs !== undefined) {
        setPausedUntil(Date.now() + cause.retryAfterMs);

        return;
      }

      setError(cause instanceof AuthError ? cause.message : "We couldn't send the code. Check your connection and try again.");
    }
  }

  const message = pauseLeft > 0 ? `Too many codes for this email. You can ask for another in ${formatWait(pauseLeft)}.` : error;

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor={inputId}>Email</Label>
        <Input
          id={inputId}
          type="email"
          inputMode="email"
          autoComplete="email"
          // oxlint-disable-next-line jsx-a11y/no-autofocus -- the step exists only to type this email.
          autoFocus
          required
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setPausedUntil(0);
          }}
          aria-invalid={message !== "" || undefined}
          aria-describedby={message === "" ? undefined : errorId}
          placeholder="you@example.com"
          className="h-12 text-base"
        />
        <p id={errorId} aria-live="polite" className="min-h-5 text-sm font-medium text-destructive">
          {message}
        </p>
      </div>
      <Button type="submit" size="lg" loading={busy} disabled={pauseLeft > 0}>
        {pauseLeft > 0 ? `Try again in ${formatWait(pauseLeft)}` : "Send code"}
      </Button>
    </form>
  );
}
