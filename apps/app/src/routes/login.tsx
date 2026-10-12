import { AuthFlow } from "@ambar/ui/components/auth-flow";
import { IRIS_ENTRY } from "@ambar/ui/components/iris";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";

import { apiUrl } from "../api-url.ts";
import { useAppSession } from "../session.ts";

// The same flow as the landing (sign in, or sign up with a link under the form), ending the same way:
// the iris closes onto the logo and opens on the moments (AppLayout opens it on the iris entry flag).
export function LoginRoute() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  // Read the email-link token once, then remove it from the URL so it doesn't linger in history.
  const [verifyToken] = useState(() => params.get("verify") ?? undefined);
  const { refresh } = useAppSession();
  // Started when the flow ends, so the read runs while the iris closes, not after.
  const sessionRead = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    if (params.has("verify")) {
      setParams({}, { replace: true });
    }
  }, [params, setParams]);

  return (
    <section className="overflow-hidden rounded-3xl border bg-card">
      <AuthFlow
        initialMode="sign-in"
        apiUrl={apiUrl}
        verifyToken={verifyToken}
        // The email link comes back here, where a moment attached in this flow is saved.
        returnTo={`${window.location.origin}/login`}
        onSignedIn={() => {
          sessionRead.current = refresh();
        }}
        onExit={() => {
          // Fully shut and the header has the new session: open onto the moments.
          void sessionRead.current.then(() =>
            navigate({ pathname: "/", search: `?${IRIS_ENTRY.param}=${IRIS_ENTRY.value}` }, { replace: true }),
          );
        }}
      />
    </section>
  );
}
