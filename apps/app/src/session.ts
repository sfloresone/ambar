// What every route can read from AppLayout (React Router outlet context). Its own module, so route files
// only export components (fast refresh) and routes don't import each other.
import type { Session } from "@ambar/core";
import { useOutletContext } from "react-router";

export type AppContext = {
  session: Session | null | undefined;
  /** Re-read the session after it changed elsewhere (signing in on /login). */
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

export function useAppSession(): AppContext {
  return useOutletContext<AppContext>();
}
