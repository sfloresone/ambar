import { plans } from "@ambar/core";
import { Button } from "@ambar/ui/components/button";
import { Link } from "react-router";

import { useAppSession } from "./app-layout.tsx";

// Settings inside the same frame. Account and plan only; usage arrives with the real API.
export function SettingsRoute() {
  const { session, signOut } = useAppSession();
  const free = plans.find((plan) => plan.monthly === 0);

  if (session === undefined) {
    return null;
  }

  if (session === null) {
    return (
      <section className="m-auto flex flex-col items-center gap-3 text-center">
        <h1 className="text-2xl tracking-tight">Sign in to see your settings</h1>
        <Link to="/login" className="text-sm text-link underline-offset-4 hover:underline">
          Sign in
        </Link>
      </section>
    );
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
