// The signed-in session for a screen (e.g. an app header). Read once on mount from the auth client for
// apiUrl (mock today), and again on demand (refresh) when it changes elsewhere, e.g. after signing in.
// Only the latest read wins: a slow, older response never overwrites a newer state (or a sign out).
import type { Session } from "@ambar/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createClients } from "./clients.ts";

type SessionState = {
  /** undefined while loading, null when signed out. */
  session: Session | null | undefined;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

export function useSession(apiUrl?: string): SessionState {
  const clients = useMemo(() => createClients(apiUrl), [apiUrl]);
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  /** Bumped by every read and sign out, and on unmount: a response applies only if it is still the latest. */
  const latest = useRef(0);

  const refresh = useCallback(async () => {
    const request = ++latest.current;
    const next = await clients.auth.getSession();

    if (request === latest.current) {
      setSession(next);
    }
  }, [clients]);

  useEffect(() => {
    void refresh();

    return () => {
      latest.current += 1;
    };
  }, [refresh]);

  const signOut = useCallback(async () => {
    latest.current += 1;
    await clients.auth.signOut();
    setSession(null);
  }, [clients]);

  return { session, refresh, signOut };
}
