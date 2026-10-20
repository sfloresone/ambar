// Keep flow: email → 6-digit code (or the email link) → keeping (upload) → kept → into the app, with the
// user's moment in view the whole time. The mode (sign in / sign up) changes the words; the backend flow
// is the same, and verifying says whether the account was just created. Used through AuthFlow.
import { PROVIDER_ERROR_COPY, type AuthReturn, type CodeRequest, type SignedIn } from "@ambar/core";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useEffectEvent, useMemo, useRef, useState, type ComponentType, type ReactNode, type Ref } from "react";

import { Button } from "../../components/button.tsx";
import { ProviderButtons } from "../../components/provider-buttons.tsx";
import { createClients, MOCK_CODE, mockLinkToken } from "../../lib/clients.ts";
import { EASE } from "../../lib/motion.ts";
import { clearPendingMoment, loadPendingMoment, savePendingMoment } from "../../lib/pending-moment.ts";
import { readItem, writeItem } from "../../lib/storage.ts";
import { wait } from "../../lib/wait.ts";
import { CodeStep } from "./code-step.tsx";
import { EmailStep } from "./email-step.tsx";
import { MomentCard, type MomentStatus } from "./moment-card.tsx";

const LAST_EMAIL_KEY = "ambar.last-email";

/** Pause on "Kept." before moving on, so the user sees it land. */
const KEPT_PAUSE_MS = 1200;

export type AuthMode = "sign-in" | "sign-up";

type Step =
  | { name: "email" }
  | { name: "code"; request: CodeRequest }
  | { name: "verifying-link" }
  | { name: "returning" }
  | { name: "keeping"; signedIn: SignedIn; progress: number }
  | { name: "failed"; signedIn: SignedIn }
  | { name: "done"; signedIn: SignedIn };

export type TitleProps = {
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
  onDone: (signedIn: SignedIn) => void;
  /** What the browser came back with (read from the URL by the platform): the email link or a provider's answer. */
  authReturn?: AuthReturn;
  /** Sign in or sign up: the words on each step. */
  mode: AuthMode;
  /** The page the email link opens: where this flow runs, so the link finds the pending moment. */
  returnTo?: string;
  /** Where Google or GitHub send the browser back; with a moment it must be this page (the moment is saved here). */
  providerReturnTo?: (hasMoment: boolean) => string;
  /** Under the email form only (e.g. the link to switch between sign in and sign up). */
  emailFooter?: ReactNode;
  /** Heading element. The landing dialog passes Base UI's Dialog.Title so the dialog stays named. */
  Title?: ComponentType<TitleProps>;
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

export function KeepFlow({ file: droppedFile = null, apiUrl, onDone, authReturn, mode, returnTo, providerReturnTo, emailFooter, Title = DefaultTitle }: KeepFlowProps) {
  const clients = useMemo(() => createClients(apiUrl), [apiUrl]);
  const reduceMotion = useReducedMotion() === true;
  const [file, setFile] = useState<File | null>(droppedFile);
  const [email, setEmail] = useState(readLastEmail);
  const [step, setStep] = useState<Step>(() => firstStep(authReturn));
  const [returnedError, setReturnedError] = useState(authReturn?.kind === "error" ? PROVIDER_ERROR_COPY[authReturn.code] : "");
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

  async function finish(signedIn: SignedIn) {
    setStep({ name: "done", signedIn });
    await wait(KEPT_PAUSE_MS);
    onDone(signedIn);
  }

  async function keep(signedIn: SignedIn, moment: File | null) {
    if (moment === null) {
      await finish(signedIn);

      return;
    }

    setStep({ name: "keeping", signedIn, progress: 0 });

    try {
      await clients.upload.uploadMoment(moment, signedIn.session, (progress) => setStep({ name: "keeping", signedIn, progress }));
      await clearPendingMoment();
      await finish(signedIn);
    } catch {
      setStep({ name: "failed", signedIn });
    }
  }

  // The token this component already started verifying. React runs effects twice in development
  // (StrictMode): a link token works once, so the second run must not send it again.
  const verifyingToken = useRef<string | null>(null);

  // The email link: verify the token, then keep the pending moment (loaded above) like the code path.
  const verifyLink = useEffectEvent((token: string) => {
    if (verifyingToken.current === token) {
      return;
    }

    verifyingToken.current = token;

    void clients.auth
      .verifyLink(token)
      .then(async (signedIn) => {
        const pending = droppedFile ?? (await loadPendingMoment());

        setFile(pending);
        await keep(signedIn, pending);
      })
      .catch(() => setStep({ name: "email" }));
  });

  // Back from Google or GitHub signed in (the session cookie is set): read it, then keep the pending moment.
  const finishProvider = useEffectEvent((created: boolean) => {
    void clients.auth
      .getSession()
      .then(async (session) => {
        if (session === null) {
          setReturnedError(PROVIDER_ERROR_COPY["oauth-failed"]);
          setStep({ name: "email" });

          return;
        }

        const pending = droppedFile ?? (await loadPendingMoment());

        setFile(pending);
        await keep({ session, created }, pending);
      })
      .catch(() => {
        setReturnedError(PROVIDER_ERROR_COPY["oauth-failed"]);
        setStep({ name: "email" });
      });
  });

  useEffect(() => {
    if (authReturn?.kind === "verify") {
      verifyLink(authReturn.token);
    } else if (authReturn?.kind === "provider") {
      finishProvider(authReturn.created);
    }
  }, [authReturn]);

  async function requestCode(nextEmail: string) {
    const request = await clients.auth.requestCode(nextEmail, { returnTo });

    writeItem(LAST_EMAIL_KEY, request.email);
    setEmail(request.email);
    setStep({ name: "code", request });
  }

  async function verifyCode(code: string) {
    await keep(await clients.auth.verifyCode(email, code), file);
  }

  const status: MomentStatus =
    step.name === "keeping" ? "keeping" : step.name === "failed" ? "failed" : step.name === "done" ? "kept" : step.name === "code" ? "waiting" : "ready";

  const providerBack = providerReturnTo?.(file !== null) ?? returnTo;
  const copy = stepCopy(step, { mode, email, hasMoment: file !== null });

  // Each step's copy and controls settle in; the moment card in between stays put across steps.
  const settle = {
    initial: reduceMotion ? false : { opacity: 0, transform: "translateY(8px)" },
    animate: { opacity: 1, transform: "translateY(0px)" },
    transition: { duration: 0.35, ease: EASE.develop },
  } as const;

  return (
    <div data-slot="keep-flow" className="flex flex-col gap-6">
      <motion.div key={`copy-${step.name}`} className="flex flex-col gap-2" {...settle}>
        <Title ref={titleRef} tabIndex={-1} className="text-3xl tracking-tight text-balance outline-hidden sm:text-4xl">
          {copy.title}
        </Title>
        <p className="text-pretty text-muted-foreground">{copy.lead}</p>
      </motion.div>

      {file !== null && <MomentCard file={file} status={status} progress={step.name === "keeping" ? step.progress : 0} />}

      <motion.div key={step.name} className="flex flex-col gap-6 empty:hidden" {...settle}>

        {step.name === "email" && (
          <>
            <EmailStep defaultEmail={email} initialError={returnedError} onSubmit={requestCode} />
            {providerBack !== undefined && <ProviderButtons auth={clients.auth} returnTo={providerBack} />}
            {emailFooter}
          </>
        )}

        {step.name === "code" && (
          <CodeStep
            key={step.request.expiresAt}
            request={step.request}
            onVerify={verifyCode}
            onResend={() => clients.auth.requestCode(email, { returnTo })}
            onChangeEmail={() => setStep({ name: "email" })}
          />
        )}

        {step.name === "failed" && (
          <Button size="lg" onClick={() => keep(step.signedIn, file)} className="w-fit">
            Try again
          </Button>
        )}

        {step.name === "done" && (
          <Button size="lg" onClick={() => onDone(step.signedIn)} className="w-fit">
            Open Ambar
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

function firstStep(authReturn: AuthReturn | undefined): Step {
  switch (authReturn?.kind) {
    case "verify":
      return { name: "verifying-link" };
    case "provider":
      return { name: "returning" };
    default:
      return { name: "email" };
  }
}

/** Heading and lead of each step. */
type StepCopy = {
  title: string;
  lead: string;
};

type CopyContext = {
  mode: AuthMode;
  email: string;
  hasMoment: boolean;
};

function stepCopy(step: Step, { mode, email, hasMoment }: CopyContext): StepCopy {
  switch (step.name) {
    case "email":
      if (mode === "sign-in") {
        return { title: "Welcome back", lead: "Enter your email and we'll send you a code to sign in." };
      }

      return hasMoment
        ? { title: "Where should we keep it?", lead: "Your email is all it takes to create your Ambar." }
        : { title: "Create your Ambar", lead: "Your email is all it takes. We'll send you a code." };
    case "code":
      return { title: "Check your inbox", lead: `We sent a 6-digit code to ${email}. It also has a link, if that's easier.` };
    case "verifying-link":
      return { title: "Signing you in…", lead: "One moment while we check your link." };
    case "returning":
      return { title: "Signing you in…", lead: "Welcome back. One moment." };
    case "keeping":
      return { title: "Keeping it…", lead: "You're in. Your moment is on its way." };
    case "failed":
      return { title: "Almost there", lead: "You're signed in, but the upload didn't finish. Your moment is still here." };
    case "done":
      if (step.signedIn.created) {
        return hasMoment
          ? { title: "Welcome to Ambar", lead: "Your first moment is kept. It will be here when you look." }
          : { title: "Welcome to Ambar", lead: "Your Ambar is ready. Taking you in." };
      }

      return hasMoment ? { title: "Kept.", lead: "Welcome back. It will be here when you look." } : { title: "Welcome back", lead: "Taking you to your moments." };
  }
}
