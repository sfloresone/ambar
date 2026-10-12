// The landing dialog's content: AuthFlow wired for the landing. Loaded lazily by FirstMomentDialog, so
// Motion, the dropzone and the flow only download when someone opens (or is about to open) it.
import { Dialog } from "@base-ui/react/dialog";

import { AuthFlow, type AuthMode } from "./auth-flow.tsx";
import { withIrisEntry } from "./iris.tsx";

export type AuthDialogContentProps = {
  /** The app, where the flow ends (the iris hands off to it). */
  continueHref: string;
  backdropSrc?: string;
  apiUrl?: string;
  verifyToken?: string;
  mode: AuthMode;
};

export default function AuthDialogContent({ continueHref, backdropSrc, apiUrl, verifyToken, mode }: AuthDialogContentProps) {
  return (
    <AuthFlow
      initialMode={mode}
      apiUrl={apiUrl}
      verifyToken={verifyToken}
      // The landing's home handles ?verify (the hero dialog), and the pending moment is saved on this origin.
      returnTo={`${window.location.origin}/`}
      backdropSrc={backdropSrc}
      Title={Dialog.Title}
      Description={Dialog.Description}
      onExit={() => window.location.assign(withIrisEntry(continueHref))}
    />
  );
}
