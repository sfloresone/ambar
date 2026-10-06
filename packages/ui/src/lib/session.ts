// The signed-in session for a screen (e.g. an app header). Reads it from the auth client for apiUrl
// (mock today) and refreshes on demand, e.g. after signing in on another route.
import type { Session } from "@ambar/core";
import { useCallback, useEffect, useMemo, useState } from "react";

import { createClients } from "./clients.ts";

type SessionState = {
  /** undefined while loading, null when signed out. */
  session: Session | null | undefined;
  refresh: () => void;
  signOut: () => Promise<void>;
};

export function useSession(apiUrl?: string): SessionState {
  const clients = useMemo(() => createClients(apiUrl), [apiUrl]);
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  const refresh = useCallback(() => {
    void clients.auth.getSession().then(setSession);
  }, [clients]);

  useEffect(() => refresh(), [refresh]);

  async function signOut() {
    await clients.auth.signOut();
    setSession(null);
  }

  return { session, refresh, signOut };
}
