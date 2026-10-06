// Keep flow: sign up and sign in in one step, with the user's moment in view the whole time.
// drop (elsewhere) → email → 6-digit code (or the email link) → keeping (upload) → kept → into the app.
// Unknown email = new account; known = sign in. Used by the landing dialog and by the app's /login.
import type { CodeRequest, Session } from "@ambar/core";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useEffectEvent, useMemo, useRef, useState, type ComponentType, type ReactNode, type Ref } from "react";

import { Button } from "../../components/button.tsx";
import { createClients, MOCK_CODE, mockLinkToken } from "../../lib/clients.ts";
import { EASE } from "../../lib/motion.ts";
import { clearPendingMoment, loadPendingMoment, savePendingMoment } from "../../lib/pending-moment.ts";
import { readItem, writeItem } from "../../lib/storage.ts";
import { cn } from "../../lib/utils.ts";
import { wait } from "../../lib/wait.ts";
import { CodeStep } from "./code-step.tsx";
import { EmailStep } from "./email-step.tsx";
import { MomentCard, type MomentStatus } from "./moment-card.tsx";

const LAST_EMAIL_KEY = "ambar.last-email";

/** Pause on "Kept." before moving on, so the user sees it land. */
const KEPT_PAUSE_MS = 1200;

type Step =
  | { name: "email" }
  | { name: "code"; request: CodeRequest }
  | { name: "verifying-link" }
  | { name: "keeping"; session: Session; progress: number }
  | { name: "failed"; session: Session }
  | { name: "done"; session: Session };

type TitleProps = {
  className?: string;
  children: ReactNode;
  tabIndex?: number;
  ref?: Ref<HTMLHeadingElement>;
};

type KeepFlowProps = {
  /** The dropped moment. Without it, the flow looks for a pending one saved on this origin. */
  file?: File | null;
  /** Real API base URL. Unset = mock clients (today). */
  apiUrl?: string;
  /** Called once signed in (and the moment kept). Each platform decides where that goes. */
  onDone: (session: Session) => void;
  /** Token from the email link (?verify=…), to finish sign-in without the code. */
  verifyToken?: string;
  /** Heading element. The landing dialog passes Base UI's Dialog.Title so the dialog stays named. */
  Title?: ComponentType<TitleProps>;
  /** Compact moment card on top instead of a side column (narrow containers). */
  compact?: boolean;
};

function readLastEmail(): string {
  return readItem(LAST_EMAIL_KEY) ?? "";
}

function DefaultTitle({ ref, children, ...props }: TitleProps) {
  return (
    <h1 ref={ref} {...props}>
      {children}
    </h1>
  );
}

export function KeepFlow({ file: droppedFile = null, apiUrl, onDone, verifyToken, Title = DefaultTitle, compact = false }: KeepFlowProps) {
  const clients = useMemo(() => createClients(apiUrl), [apiUrl]);
  const reduceMotion = useReducedMotion() === true;
  const [file, setFile] = useState<File | null>(droppedFile);
  const [email, setEmail] = useState(readLastEmail);
  const [step, setStep] = useState<Step>(verifyToken === undefined ? { name: "email" } : { name: "verifying-link" });
  const titleRef = useRef<HTMLHeadingElement>(null);

  // Keep the dropped file on this origin until it is uploaded; or pick up one saved earlier.
  useEffect(() => {
    if (droppedFile !== null) {
      void savePendingMoment(droppedFile);

      return;
    }

    void loadPendingMoment().then((pending) => {
      if (pending !== null) {
        setFile(pending);
      }
    });
  }, [droppedFile]);

  // Move focus to the heading when the step changes, so screen readers hear where they are.
  useEffect(() => {
    if (step.name !== "email" && step.name !== "code") {
      titleRef.current?.focus();
    }
  }, [step.name]);

  async function finish(session: Session) {
    setStep({ name: "done", session });
    await wait(KEPT_PAUSE_MS);
    onDone(session);
  }

  async function keep(session: Session, moment: File | null) {
    if (moment === null) {
      await finish(session);

      return;
    }

    setStep({ name: "keeping", session, progress: 0 });

    try {
      await clients.upload.uploadMoment(moment, session, (progress) => setStep({ name: "keeping", session, progress }));
      await clearPendingMoment();
      await finish(session);
    } catch {
      setStep({ name: "failed", session });
    }
  }

  // The email link: verify the token, then keep the pending moment (loaded above) like the code path.
  const verifyLink = useEffectEvent((token: string) => {
    let cancelled = false;

    void clients.auth
      .verifyLink(token)
      .then(async (session) => {
        const pending = droppedFile ?? (await loadPendingMoment());

        if (!cancelled) {
          setFile(pending);
          await keep(session, pending);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStep({ name: "email" });
        }
      });

    return () => {
      cancelled = true;
    };
  });

  useEffect(() => {
    if (verifyToken !== undefined) {
      return verifyLink(verifyToken);
    }
  }, [verifyToken]);

  async function requestCode(nextEmail: string) {
    const request = await clients.auth.requestCode(nextEmail);

    writeItem(LAST_EMAIL_KEY, request.email);
    setEmail(request.email);
    setStep({ name: "code", request });
  }

  async function verifyCode(code: string) {
    const session = await clients.auth.verifyCode(email, code);

    await keep(session, file);
  }

  const status: MomentStatus =
    step.name === "keeping" ? "keeping" : step.name === "failed" ? "failed" : step.name === "done" ? "kept" : step.name === "code" ? "waiting" : "ready";

  const copy = stepCopy(step, email, file !== null);

  return (
    <div
      data-slot="keep-flow"
      data-has-moment={file !== null || undefined}
      className={cn(
        "grid gap-6",
        file === null && "mx-auto w-full max-w-md",
        file !== null && !compact && "md:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)] md:gap-10",
      )}
    >
      {file !== null && (
        <div className={cn(!compact && "md:sticky md:top-0 md:self-start")}>
          <MomentCard file={file} status={status} progress={step.name === "keeping" ? step.progress : 0} layout={compact ? "compact" : "responsive"} />
        </div>
      )}
      <motion.div
        key={step.name}
        className="flex flex-col gap-6"
        initial={reduceMotion ? false : { opacity: 0, transform: "translateY(8px)" }}
        animate={{ opacity: 1, transform: "translateY(0px)" }}
        transition={{ duration: 0.35, ease: EASE.develop }}
      >
        <div className="flex flex-col gap-2">
          <Title ref={titleRef} tabIndex={-1} className="text-3xl tracking-tight text-balance outline-hidden sm:text-4xl">
            {copy.title}
          </Title>
          <p className="text-pretty text-muted-foreground">{copy.lead}</p>
        </div>

        {step.name === "email" && <EmailStep defaultEmail={email} onSubmit={requestCode} />}

        {step.name === "code" && (
          <CodeStep
            key={step.request.expiresAt}
            request={step.request}
            onVerify={verifyCode}
            onResend={() => clients.auth.requestCode(email)}
            onChangeEmail={() => setStep({ name: "email" })}
          />
        )}

        {step.name === "failed" && (
          <Button size="lg" onClick={() => keep(step.session, file)} className="w-fit">
            Try again
          </Button>
        )}

        {step.name === "done" && (
          <Button size="lg" onClick={() => onDone(step.session)} className="w-fit">
            Open Ámbar
          </Button>
        )}

        {clients.mock && step.name === "code" && (
          <p className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground">
            Demo mode, no emails are sent. Use code <span className="font-medium text-foreground tabular-nums">{MOCK_CODE}</span>, or{" "}
            <a href={`?verify=${mockLinkToken(email)}`} className="font-medium text-link underline underline-offset-4">
              open the email link
            </a>
            .
          </p>
        )}
      </motion.div>
    </div>
  );
}

/** Heading and lead of each step. */
type StepCopy = {
  title: string;
  lead: string;
};

function stepCopy(step: Step, email: string, hasMoment: boolean): StepCopy {
  switch (step.name) {
    case "email":
      return hasMoment
        ? { title: "Where should we keep it?", lead: "Your email is all it takes. New here or coming back, it's the same step." }
        : { title: "Sign in to Ámbar", lead: "Your email is all it takes. New here or coming back, it's the same step." };
    case "code":
      return { title: "Check your inbox", lead: `We sent a 6-digit code to ${email}. It also has a link, if that's easier.` };
    case "verifying-link":
      return { title: "Signing you in…", lead: "One moment while we check your link." };
    case "keeping":
      return { title: "Keeping it…", lead: "You're in. Your moment is on its way." };
    case "failed":
      return { title: "Almost there", lead: "You're signed in, but the upload didn't finish. Your moment is still here." };
    case "done":
      return hasMoment ? { title: "Kept.", lead: "It will be here when you look." } : { title: "You're in.", lead: "Taking you to your moments." };
  }
}
