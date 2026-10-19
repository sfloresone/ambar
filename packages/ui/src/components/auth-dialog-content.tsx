// The landing dialog's content: AuthFlow wired for the landing. Loaded lazily by FirstMomentDialog, so
// Motion, the dropzone and the flow only download when someone opens (or is about to open) it.
import type { AuthReturn } from "@ambar/core";
import { Dialog } from "@base-ui/react/dialog";

import { AuthFlow, type AuthMode } from "./auth-flow.tsx";
import { withIrisEntry } from "./iris.tsx";

export type AuthDialogContentProps = {
  /** The app, where the flow ends (the iris hands off to it). */
  continueHref: string;
  backdropSrc?: string;
  apiUrl?: string;
  /** What the landing came back with (?verify=, ?oauth=, ?error=), read by FirstMomentDialog. */
  authReturn?: AuthReturn;
  mode: AuthMode;
};

export default function AuthDialogContent({ continueHref, backdropSrc, apiUrl, authReturn, mode }: AuthDialogContentProps) {
  return (
    <AuthFlow
      initialMode={mode}
      apiUrl={apiUrl}
      authReturn={authReturn}
      // The landing's home handles ?verify (the hero dialog), and the pending moment is saved on this origin.
      returnTo={`${window.location.origin}/`}
      // A moment waits on this origin, so the provider brings people back here to keep it; without one they
      // go straight to the app, whose closed iris greets them (?entry=iris).
      providerReturnTo={(hasMoment) => (hasMoment ? `${window.location.origin}/` : withIrisEntry(new URL("/login", continueHref).toString()))}
      backdropSrc={backdropSrc}
      Title={Dialog.Title}
      Description={Dialog.Description}
      onExit={() => window.location.assign(withIrisEntry(continueHref))}
    />
  );
}
