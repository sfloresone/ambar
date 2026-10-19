// Settings → Sign-in methods: every way into Ambar, one row each, whether or not this server has it on
// (a provider it hasn't configured shows "Not available" instead of Connect). Google and GitHub connect through
// the provider handoff (the iris closes onto the row's logo) and come back to returnTo; disconnecting is
// one tap, reversible, and never locks anyone out (codes to the account's email always work). Email and
// password is a placeholder until passwords exist.
import { PROVIDERS, type AuthClient, type Identity, type Provider } from "@ambar/core";
import { EnvelopeSimpleIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { Button } from "../../components/button.tsx";
import { useProviderHandoff } from "../../components/provider-handoff.tsx";
import { PROVIDER_NAME, ProviderLogo } from "../../components/provider-logo.tsx";
import { useToast } from "../../components/toaster.tsx";

type SignInMethodsProps = {
  auth: AuthClient;
  /** Where the provider sends the browser back after connecting (?oauth=linked or ?error=). */
  returnTo: string;
};

type Loaded = {
  providers: Provider[];
  identities: Identity[];
};

export function SignInMethods({ auth, returnTo }: SignInMethodsProps) {
  const toast = useToast();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [busy, setBusy] = useState<Provider | null>(null);
  const logos = useRef(new Map<Provider, HTMLSpanElement>());
  const { start, leaving, overlay } = useProviderHandoff();

  useEffect(() => {
    let active = true;

    // providers() never fails (it reads as none); identities can, and must not hide the providers.
    void Promise.all([auth.providers(), auth.identities().catch(() => [])]).then(([providers, identities]) => {
      if (active) {
        setLoaded({ providers, identities });
      }
    });

    return () => {
      active = false;
    };
  }, [auth]);

  async function connect(provider: Provider) {
    start(provider, logos.current.get(provider) ?? null, await auth.startProviderSignIn(provider, { returnTo, intent: "link" }));
  }

  async function disconnect(provider: Provider) {
    setBusy(provider);

    try {
      await auth.disconnect(provider);
      setLoaded((current) => current && { ...current, identities: current.identities.filter((identity) => identity.provider !== provider) });
      toast.add({ title: `${PROVIDER_NAME[provider]} disconnected.`, description: "You can connect it again any time." });
    } catch {
      toast.add({ title: `We couldn't disconnect ${PROVIDER_NAME[provider]}.`, description: "Check your connection and try again." });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border bg-card p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg">Sign-in methods</h2>
        <p className="text-sm text-muted-foreground">Ways into your Ambar. A code to your email always works.</p>
      </div>
      <ul className="flex flex-col divide-y">
        <MethodRow icon={<EnvelopeSimpleIcon weight="bold" className="size-5" />} label="Sign in with email and password">
          {/* Placeholder until passwords exist: shown, never actionable. */}
          <span className="text-xs text-muted-foreground">Soon</span>
          <Button tone="cloud" size="sm" disabled>
            Enable
          </Button>
        </MethodRow>
        {PROVIDERS.map((provider) => {
          const identity = loaded?.identities.find((item) => item.provider === provider);
          // Unknown until loaded; then off when this server hasn't configured the provider.
          const available = loaded?.providers.includes(provider) ?? false;

          return (
            <MethodRow
              key={provider}
              icon={
                <span
                  ref={(element) => {
                    if (element === null) {
                      logos.current.delete(provider);
                    } else {
                      logos.current.set(provider, element);
                    }
                  }}
                  className="inline-flex"
                >
                  <ProviderLogo provider={provider} />
                </span>
              }
              label={`Sign in with ${PROVIDER_NAME[provider]}`}
              detail={identity?.email}
            >
              {loaded !== null && !available && identity === undefined && <span className="text-xs text-muted-foreground">Not available</span>}
              {/* One button per row, so focus stays on it when it turns from Disconnect into Connect. */}
              <Button
                tone="cloud"
                size="sm"
                loading={busy === provider}
                disabled={loaded === null || leaving !== null || (!available && identity === undefined)}
                aria-label={identity === undefined ? `Connect ${PROVIDER_NAME[provider]}` : `Disconnect ${PROVIDER_NAME[provider]}`}
                onClick={() => void (identity === undefined ? connect(provider) : disconnect(provider))}
              >
                {identity === undefined ? "Connect" : "Disconnect"}
              </Button>
            </MethodRow>
          );
        })}
      </ul>
      <p aria-live="polite" className="sr-only">
        {leaving === null ? "" : `Connecting to ${PROVIDER_NAME[leaving]}`}
      </p>
      {overlay}
    </div>
  );
}

type MethodRowProps = {
  icon: ReactNode;
  label: string;
  /** The connected account, under the label. */
  detail?: string;
  children: ReactNode;
};

function MethodRow({ icon, label, detail, children }: MethodRowProps) {
  return (
    <li className="flex min-h-16 items-center gap-3 py-3">
      <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-muted text-foreground">
        {icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm">{label}</span>
        {detail !== undefined && <span className="truncate text-xs text-muted-foreground">{detail}</span>}
      </span>
      <span className="flex shrink-0 items-center gap-3">{children}</span>
    </li>
  );
}
