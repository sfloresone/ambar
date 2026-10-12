// One-time code field: one native input (so paste, autofill from email/SMS and screen readers just work),
// drawn as six cells. Calls onComplete as soon as the last digit is in, so nobody has to press a button.
import { CODE_LENGTH } from "@ambar/core";
import { useId, useState, type ChangeEvent } from "react";

import { cn } from "../lib/utils.ts";

type CodeInputProps = {
  value: string;
  onChange: (value: string) => void;
  onComplete: (code: string) => void;
  label: string;
  invalid?: boolean;
  /** Read-only while the code is being checked; unlike disabled, it keeps focus for a retry. */
  busy?: boolean;
  /** No more tries (the code was burned): nothing to type until a new code arrives. */
  disabled?: boolean;
  /** Id of the element that explains an error, for aria-describedby. */
  describedBy?: string;
};

export function CodeInput({ value, onChange, onComplete, label, invalid = false, busy = false, disabled = false, describedBy }: CodeInputProps) {
  const id = useId();
  const [focused, setFocused] = useState(false);
  const cells = Array.from({ length: CODE_LENGTH }, (_, index) => value[index] ?? "");

  function change(event: ChangeEvent<HTMLInputElement>) {
    // Keep digits only: pasting "123 456" or "Your code: 123456" still works.
    const next = event.target.value.replaceAll(/\D/g, "").slice(0, CODE_LENGTH);

    onChange(next);

    if (next.length === CODE_LENGTH) {
      onComplete(next);
    }
  }

  return (
    <div className="relative w-fit" data-slot="code-input" data-invalid={invalid || undefined}>
      <input
        id={id}
        value={value}
        onChange={change}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        aria-label={label}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        readOnly={busy}
        disabled={disabled}
        aria-busy={busy || undefined}
        // oxlint-disable-next-line jsx-a11y/no-autofocus -- the code step exists only to type this code.
        autoFocus
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="\d*"
        maxLength={CODE_LENGTH}
        spellCheck={false}
        className="absolute inset-0 z-10 w-full cursor-text bg-transparent disabled:cursor-not-allowed text-transparent caret-transparent outline-hidden selection:bg-transparent"
      />
      <div aria-hidden className="flex gap-2">
        {cells.map((digit, index) => (
          <span
            // Positions are the identity of the cells.
            key={`cell-${index}`}
            className={cn(
              "grid h-14 w-11 place-items-center rounded-xl border bg-card font-heading text-2xl font-bold tabular-nums",
              "transition-[border-color,box-shadow] duration-150 motion-reduce:transition-none",
              // The cell where the next digit goes shows focus while the input is focused.
              focused && index === Math.min(value.length, CODE_LENGTH - 1) && "border-ring ring-2 ring-ring/40",
              invalid && "border-destructive",
              busy && "opacity-60",
              disabled && "opacity-40",
            )}
          >
            {digit}
          </span>
        ))}
      </div>
    </div>
  );
}
