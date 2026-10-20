import { AUTH_RETURN_PARAMS, plans, PROVIDER_ERROR_COPY, readAuthReturn } from "@ambar/core";
import { Button } from "@ambar/ui/components/button";
import { withIrisEntry } from "@ambar/ui/components/iris";
import { useToast } from "@ambar/ui/components/toaster";
import { createClients } from "@ambar/ui/lib/clients";
import { SignInMethods } from "@ambar/ui/screens/settings/sign-in-methods";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";

import { apiUrl } from "../api-url.ts";
import { useAppSession } from "../session.ts";

// Settings inside the same frame. Account, sign-in methods and plan; usage arrives with the real API.
export function SettingsRoute() {
  const { session, signOut } = useAppSession();
  const free = plans.find((plan) => plan.monthly === 0);
  const [auth] = useState(() => createClients(apiUrl).auth);
  const [params, setParams] = useSearchParams();
  const toast = useToast();

  // Back from connecting Google or GitHub: say how it went, then clean the URL (the iris flag is AppLayout's).
  useEffect(() => {
    const result = readAuthReturn(params);

    if (result === null) {
      return;
    }

    if (result.kind === "linked") {
      toast.add({ title: "Sign-in method connected.", description: "You can sign in with it from now on." });
    } else if (result.kind === "error") {
      toast.add({ title: "Not connected.", description: PROVIDER_ERROR_COPY[result.code] });
    }

    for (const param of AUTH_RETURN_PARAMS) {
      params.delete(param);
    }

    setParams(params, { replace: true });
  }, [params, setParams, toast]);

  // AppLayout renders routes only for a signed-in visitor (or /login).
  if (!session) {
    return null;
  }

  return (
    <section className="mx-auto flex w-full max-w-xl flex-col gap-10">
      <h1 className="text-3xl tracking-tight">Settings</h1>

      <div className="flex flex-col gap-3 rounded-2xl border bg-card p-6">
        <h2 className="text-lg">Account</h2>
        <p className="text-sm text-muted-foreground">
          Signed in as <span className="font-medium text-foreground">{session.email}</span>
        </p>
        <Button tone="cloud" onClick={signOut} className="w-fit">
          Sign out
        </Button>
      </div>

      {/* The provider brings the browser back here, with the iris shut until Settings is on screen. */}
      <SignInMethods auth={auth} returnTo={withIrisEntry(`${window.location.origin}/settings`)} />

      {free !== undefined && (
        <div className="flex flex-col gap-3 rounded-2xl border bg-card p-6">
          <h2 className="text-lg">Plan</h2>
          <p className="text-sm text-muted-foreground">
            You're on <span className="font-medium text-foreground">{free.name}</span>: {free.storage}, {free.readings},{" "}
            {free.moments.toLowerCase()}.
          </p>
          <p className="text-sm text-muted-foreground">Usage and upgrades will appear here once your account is connected.</p>
        </div>
      )}
    </section>
  );
}
