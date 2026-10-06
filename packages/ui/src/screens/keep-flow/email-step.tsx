import { AuthError, isValidEmail } from "@ambar/core";
import { useId, useState, type FormEvent } from "react";

import { Button } from "../../components/button.tsx";
import { Input } from "../../components/input.tsx";
import { Label } from "../../components/label.tsx";

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
      setError(cause instanceof AuthError ? cause.message : "We couldn't send the code. Check your connection and try again.");
      setBusy(false);
    }
  }

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
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={error !== "" || undefined}
          aria-describedby={error === "" ? undefined : errorId}
          placeholder="you@example.com"
          className="h-12 text-base"
        />
        <p id={errorId} aria-live="polite" className="min-h-5 text-sm font-medium text-destructive">
          {error}
        </p>
      </div>
      <Button type="submit" size="lg" loading={busy}>
        Send code
      </Button>
    </form>
  );
}
