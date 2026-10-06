import type { Session } from "@ambar/core";
import { buttonVariants } from "@ambar/ui/components/button";
import { GetAmbarMenu } from "@ambar/ui/components/get-ambar-menu";
import { IRIS_ENTRY, Iris, isIrisEntry } from "@ambar/ui/components/iris";
import { UserMenu } from "@ambar/ui/components/user-menu";
import { PAGE_FRAME, PILL_BRAND, PILL_HEADER, PILL_HEADER_WRAP, PILL_LINK } from "@ambar/ui/lib/layout";
import { useSession } from "@ambar/ui/lib/session";
import { cn } from "@ambar/ui/lib/utils";
import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate, useOutletContext, useSearchParams } from "react-router";

/** What every route can read from the layout. */
type AppContext = {
  session: Session | null | undefined;
  signOut: () => Promise<void>;
};

export function useAppSession(): AppContext {
  return useOutletContext<AppContext>();
}

/** Set by index.html before any JS when the landing hands off with the iris entry flag. */
function arrivingThroughIris(): boolean {
  return document.documentElement.dataset.entry === IRIS_ENTRY.value;
}

// Same frame as the landing (floating glass pill, max-w-5xl px-6), so the app reads as the same place.
export function AppLayout() {
  // From the landing (cover painted by index.html) or after signing in here (?entry=iris in the URL).
  const [arrived, setArrived] = useState(arrivingThroughIris);
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const header = useRef<HTMLElement>(null);
  const { pathname } = useLocation();
  const { session, refresh, signOut } = useSession(import.meta.env.VITE_API_URL);

  // Re-read on every route change: signing in on /login lands on / with a fresh session.
  useEffect(() => refresh(), [pathname, refresh]);

  async function signOutAndLeave() {
    await signOut();
    navigate("/login", { replace: true });
  }

  // The first route is rendered: swap the static cover for the Iris (identical first frame) and open it.
  useEffect(() => {
    if (arrivingThroughIris()) {
      document.getElementById("iris-cover")?.remove();
      delete document.documentElement.dataset.entry;
    }
  }, []);

  function opened() {
    setArrived(false);

    // The flag served its purpose: keep it out of the address bar and history.
    if (params.has(IRIS_ENTRY.param)) {
      params.delete(IRIS_ENTRY.param);
      setParams(params, { replace: true });
    }

    // Put keyboard and screen-reader users at the start of the page they arrived on.
    const heading = document.querySelector<HTMLElement>("main h1");

    heading?.setAttribute("tabindex", "-1");
    heading?.focus({ preventScroll: true });
  }

  return (
    <div className="flex min-h-svh flex-col">
      {/* Mounted in the same render that sees ?entry=iris, so no frame shows the page uncovered. */}
      {(arrived || isIrisEntry(params)) && <Iris state="opening" onDone={opened} />}
      <header ref={header} className={PILL_HEADER_WRAP}>
        <div className={cn(PILL_HEADER, session && "gap-3 pl-2.5 sm:gap-6")}>
          {session && (
            <UserMenu container={header} email={session.email} onSettings={() => navigate("/settings")} onSignOut={signOutAndLeave} />
          )}
          <Link to="/" className={PILL_BRAND}>
            Ámbar
          </Link>
          <nav aria-label="Main" className="flex gap-1 text-sm">
            <NavLink to="/" end className={PILL_LINK}>
              Moments
            </NavLink>
          </nav>
          {/* Nothing while the session loads, so a signed-in user never sees "Sign in" flash. */}
          {session === null && (
            <Link to="/login" className={buttonVariants({ tone: "cloud", size: "sm", className: "rounded-full" })}>
              Sign in
            </Link>
          )}
          {session && <GetAmbarMenu container={header} />}
        </div>
      </header>
      <main className={cn(PAGE_FRAME, "flex flex-1 flex-col py-16 sm:py-24 [&_h1:focus]:outline-hidden")}>
        <Outlet context={{ session, signOut: signOutAndLeave } satisfies AppContext} />
      </main>
    </div>
  );
}
