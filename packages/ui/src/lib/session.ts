// The signed-in session for a screen (e.g. an app header). Read once on mount from the auth client for
// apiUrl (mock today), and again on demand (refresh) when it changes elsewhere, e.g. after signing in.
// Only the latest read wins: a slow, older response never overwrites a newer state (or a sign out).
// A page restored from the back/forward cache reads it again: it may have been signed out meanwhile.
import type { Session } from "@ambar/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createClients } from "./clients.ts";

type SessionState = {
  /** undefined while loading, null when signed out. */
  session: Session | null | undefined;
  /** The last read failed (network, server): we can't tell whether anyone is signed in. */
  failed: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

export function useSession(apiUrl?: string): SessionState {
  const clients = useMemo(() => createClients(apiUrl), [apiUrl]);
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [failed, setFailed] = useState(false);
  /** Bumped by every read and sign out, and on unmount: a response applies only if it is still the latest. */
  const latest = useRef(0);

  const refresh = useCallback(() => {
    const request = ++latest.current;

    return clients.auth.getSession().then(
      (next) => {
        if (request === latest.current) {
          setSession(next);
          setFailed(false);
        }
      },
      () => {
        if (request === latest.current) {
          setFailed(true);
        }
      },
    );
  }, [clients]);

  useEffect(() => {
    void refresh();

    const restored = (event: PageTransitionEvent) => {
      if (event.persisted) {
        void refresh();
      }
    };

    window.addEventListener("pageshow", restored);

    return () => {
      latest.current += 1;
      window.removeEventListener("pageshow", restored);
    };
  }, [refresh]);

  const signOut = useCallback(async () => {
    latest.current += 1;
    await clients.auth.signOut();
    setSession(null);
    setFailed(false);
  }, [clients]);

  return { session, failed, refresh, signOut };
}
