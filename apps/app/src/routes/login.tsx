import { AUTH_RETURN_PARAMS, readAuthReturn } from "@ambar/core";
import { AuthFlow } from "@ambar/ui/components/auth-flow";
import { IRIS_ENTRY, withIrisEntry } from "@ambar/ui/components/iris";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";

import { apiUrl } from "../api-url.ts";
import { useAppSession } from "../session.ts";

const INTO_THE_APP = { pathname: "/", search: `?${IRIS_ENTRY.param}=${IRIS_ENTRY.value}` };

// The same flow as the landing (sign in, or sign up with a link under the form), ending the same way:
// the iris closes onto the logo and opens on the moments (AppLayout opens it on the iris entry flag).
export function LoginRoute() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  // What the browser came back with (email link, Google or GitHub), read once and then removed from the
  // URL so one-time values don't linger in history.
  const [authReturn] = useState(() => readAuthReturn(params) ?? undefined);
  const { refresh } = useAppSession();
  // Started when the flow ends, so the read runs while the iris closes, not after.
  const sessionRead = useRef<Promise<void>>(Promise.resolve());
  // Back from a provider signed in: the iris is still shut (index.html painted it), open it on the moments.
  const signedInByProvider = authReturn?.kind === "provider";

  useEffect(() => {
    if (signedInByProvider) {
      void refresh().then(() => navigate(INTO_THE_APP, { replace: true }));

      return;
    }

    if (AUTH_RETURN_PARAMS.some((param) => params.has(param))) {
      for (const param of AUTH_RETURN_PARAMS) {
        params.delete(param);
      }

      setParams(params, { replace: true });
    }
  }, [navigate, params, refresh, setParams, signedInByProvider]);

  if (signedInByProvider) {
    return null;
  }

  return (
    <section className="overflow-hidden rounded-3xl border bg-card">
      <AuthFlow
        initialMode="sign-in"
        apiUrl={apiUrl}
        authReturn={authReturn}
        // The email link comes back here, where a moment attached in this flow is saved.
        returnTo={`${window.location.origin}/login`}
        // Google and GitHub too, with the iris shut (index.html paints it before any JS) until we're in.
        providerReturnTo={() => withIrisEntry(`${window.location.origin}/login`)}
        onSignedIn={() => {
          sessionRead.current = refresh();
        }}
        onExit={() => {
          // Fully shut and the header has the new session: open onto the moments.
          void sessionRead.current.then(() => navigate(INTO_THE_APP, { replace: true }));
        }}
      />
    </section>
  );
}
