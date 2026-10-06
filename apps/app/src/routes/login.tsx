import { FlowLogo } from "@ambar/ui/components/flow-logo";
import { IRIS_ENTRY, useIrisExit } from "@ambar/ui/components/iris";
import { KeepFlow } from "@ambar/ui/screens/keep-flow/keep-flow";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";

// Same flow and same ending as the landing: logo on top, email → code (or the email link), then the
// iris closes onto the logo and opens on the moments (AppLayout opens it on the iris entry flag).
export function LoginRoute() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  // Read the email-link token once, then remove it from the URL so it doesn't linger in history.
  const [verifyToken] = useState(() => params.get("verify") ?? undefined);

  const { logoRef, close, iris } = useIrisExit(() =>
    navigate({ pathname: "/", search: `?${IRIS_ENTRY.param}=${IRIS_ENTRY.value}` }, { replace: true }),
  );

  useEffect(() => {
    if (params.has("verify")) {
      setParams({}, { replace: true });
    }
  }, [params, setParams]);

  return (
    <section className="mx-auto w-full max-w-4xl">
      {iris}
      <FlowLogo ref={logoRef} />
      <KeepFlow apiUrl={import.meta.env.VITE_API_URL} verifyToken={verifyToken} onDone={close} />
    </section>
  );
}
