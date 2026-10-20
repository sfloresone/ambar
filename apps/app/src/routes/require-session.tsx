import { Button, buttonVariants } from "@ambar/ui/components/button";
import { useEffect, useState } from "react";
import { Outlet } from "react-router";

import { siteUrl } from "../api-url.ts";
import { useAppSession } from "../session.ts";

// The gate in front of every private route (router.tsx). It is UX, not security: the bundle is public and
// the API answers 401 to anything private without a session. Here it only keeps the library off screen
// for whoever isn't signed in, reading the one session AppLayout holds (never a read per route).
export function RequireSession() {
  const context = useAppSession();
  const { session, failed, refresh } = context;
  const signedOut = session === null;

  // Signed out (also after signing out in another tab, once this page comes back from the cache): the
  // public site, replacing this page so Back doesn't return here.
  useEffect(() => {
    if (signedOut) {
      window.location.replace(siteUrl);
    }
  }, [signedOut]);

  if (session) {
    return <Outlet context={context} />;
  }

  // Nothing of the library before we know who is here; if we can't tell, say so instead of guessing.
  return failed && !signedOut ? <Unreachable onRetry={refresh} /> : null;
}

/** The session couldn't be read (network or server): never show the library, never pretend you're signed out. */
function Unreachable({ onRetry }: { onRetry: () => Promise<void> }) {
  const [retrying, setRetrying] = useState(false);

  async function retry() {
    setRetrying(true);
    await onRetry();
    setRetrying(false);
  }

  return (
    <section className="m-auto flex max-w-sm flex-col items-center gap-4 text-center">
      <h1 className="text-2xl tracking-tight">We can't reach Ambar right now</h1>
      <p className="text-pretty text-muted-foreground">Check your connection and try again. Your moments are safe.</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button tone="ink" loading={retrying} onClick={retry}>
          Try again
        </Button>
        <a href={siteUrl} className={buttonVariants({ tone: "cloud" })}>
          Go to the site
        </a>
      </div>
    </section>
  );
}
