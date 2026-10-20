import { ToastProvider, Toaster } from "@ambar/ui/components/toaster";
import { createClients } from "@ambar/ui/lib/clients";
import { SignInMethods } from "@ambar/ui/screens/settings/sign-in-methods";
import { useState } from "react";

/** Settings → Sign-in methods on the mock: Connect comes straight back here as connected. */
export function SignInMethodsDemo() {
  const [auth] = useState(() => createClients().auth);

  return (
    <ToastProvider>
      <div className="w-full max-w-xl">
        <SignInMethods auth={auth} returnTo={window.location.href} />
      </div>
      <Toaster />
    </ToastProvider>
  );
}
