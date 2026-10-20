import { GetAmbarMenu } from "@ambar/ui/components/get-ambar-menu";
import { IRIS_ENTRY, Iris, isIrisEntry } from "@ambar/ui/components/iris";
import { ToastProvider, Toaster } from "@ambar/ui/components/toaster";
import { UserMenu } from "@ambar/ui/components/user-menu";
import { APP_FRAME, PILL_BRAND, PILL_HEADER, PILL_HEADER_WRAP, PILL_LINK } from "@ambar/ui/lib/layout";
import { useAutoHide } from "@ambar/ui/lib/auto-hide";
import { createMockLibrary } from "@ambar/ui/lib/library-mock";
import { useSession } from "@ambar/ui/lib/session";
import { cn } from "@ambar/ui/lib/utils";
import { LibraryProvider } from "@ambar/ui/screens/library/library-context";
import { useSearchShortcut } from "@ambar/ui/screens/library/search-palette";
import { FoldersIcon, FrameCornersIcon, ImagesIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, Outlet, useNavigate, useSearchParams } from "react-router";

import { apiUrl, siteUrl } from "../api-url.ts";
import { MomentViewerHost } from "../moment-viewer-host.tsx";
import { useFullBleed } from "../route-handle.ts";
import { SearchHost } from "../search-host.tsx";
import type { AppContext } from "../session.ts";

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
  const fullBleed = useFullBleed();
  // Steps aside while content is in use; on the Canvas it also hides when left alone.
  const { hidden, ref: header } = useAutoHide({ idleMs: fullBleed ? 2500 : undefined });
  const [searching, setSearching] = useState(false);

  useSearchShortcut(useCallback(() => setSearching(true), []));
  // Read once here; /login calls refresh() after signing in, sign out updates it directly. Which routes
  // need it is the router's call (RequireSession), not this layout's.
  const { session, failed, refresh, signOut } = useSession(apiUrl);
  // Mock data and a simulated agent until the API serves the library; same contract as the real client.
  const [library] = useState(createMockLibrary);

  // Signed out, back to the public site (replacing this page, so Back doesn't return to the library).
  async function signOutAndLeave() {
    await signOut();
    window.location.replace(siteUrl);
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
    <ToastProvider>
      <LibraryProvider client={library} keeper={session ? { name: session.email } : undefined}>
        <div className="flex min-h-svh flex-col has-[[data-moments-split]]:h-dvh has-[[data-moments-split]]:min-h-0">
          {/* Mounted in the same render that sees ?entry=iris, so no frame shows the page uncovered. */}
          {(arrived || isIrisEntry(params)) && <Iris state="opening" onDone={opened} />}
          <header
            ref={header}
            className={cn(
              PILL_HEADER_WRAP,
              "@container/header shrink-0",
              "transition-[translate,opacity] duration-300 ease-out-soft motion-reduce:transition-[opacity]",
              hidden && "pointer-events-none -translate-y-24 opacity-0 motion-reduce:translate-y-0",
            )}
          >
            <div className={cn(PILL_HEADER, "gap-1 pl-4 sm:gap-4", session && "pl-2.5")}>
              {session && (
                <UserMenu
                  container={header}
                  email={session.email}
                  onTrash={() => navigate("/trash")}
                  onSettings={() => navigate("/settings")}
                  onSignOut={signOutAndLeave}
                />
              )}
              <Link to="/" className={cn(PILL_BRAND, "mr-0 sm:mr-3")}>
                Ambar
              </Link>
              <nav aria-label="Sections" className="flex text-sm">
                <Section to="/" end icon={<ImagesIcon weight="bold" />}>
                  Moments
                </Section>
                <Section to="/collections" icon={<FoldersIcon weight="bold" />}>
                  Collections
                </Section>
                <Section to="/canvas" icon={<FrameCornersIcon weight="bold" />}>
                  Canvas
                </Section>
              </nav>
              <button type="button" onClick={() => setSearching(true)} className={cn(PILL_LINK, "flex items-center gap-2 px-2 sm:px-3.5")}>
                <MagnifyingGlassIcon weight="bold" aria-hidden className="size-4" />
                <span className="sr-only">Search</span>
                {/* Visible shortcut, part of the name: "Search ⌘K". */}
                <kbd className="hidden rounded-md border px-1.5 font-sans text-xs md:inline">⌘K</kbd>
              </button>
              {session && <GetAmbarMenu container={header} />}
            </div>
          </header>
          <main className={cn(!fullBleed && APP_FRAME, "flex flex-1 flex-col [&_h1:focus]:outline-hidden", !fullBleed && "py-10 sm:py-14", "has-[[data-moments-split]]:min-h-0")}>
            <Outlet context={{ session, failed, refresh, signOut: signOutAndLeave } satisfies AppContext} />
          </main>
        </div>
        {/* The viewer (?m= on any route) and the search show the library: only with a session. */}
        {session && <MomentViewerHost />}
        {session && <SearchHost open={searching} onOpenChange={setSearching} />}
        <Toaster />
      </LibraryProvider>
    </ToastProvider>
  );
}

type SectionProps = {
  to: string;
  end?: boolean;
  icon: ReactNode;
  children: string;
};

/** A section in the pill: icon and label (label hidden on narrow screens, still named for screen readers). */
function Section({ to, end, icon, children }: SectionProps) {
  return (
    <NavLink to={to} end={end} aria-label={children} className={cn(PILL_LINK, "flex items-center gap-1.5 px-2 sm:px-3 [&_svg]:size-4")}>
      {icon}
      <span aria-hidden className="hidden sm:inline">
        {children}
      </span>
    </NavLink>
  );
}
