// Settings → Sign-in methods: every way into Ambar, one row each, whether or not this server has it on
// (a provider it hasn't configured shows "Not available" instead of Connect). Google and GitHub connect through
// the provider handoff (the iris closes onto the row's logo) and come back to returnTo; disconnecting is
// one tap, reversible, and never locks anyone out (codes to the account's email always work). Email and
// password is a placeholder until passwords exist.
import { PROVIDERS, type AuthClient, type Identity, type Provider } from "@ambar/core";
import { CheckCircleIcon, EnvelopeSimpleIcon } from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { Button } from "../../components/button.tsx";
import { SkeletonBlock, useSkeletonSwap, type SwapPhase } from "../../components/skeleton-swap.tsx";
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
  /** null: the connected accounts couldn't be read, so no row may claim either state. */
  identities: Identity[] | null;
};

export function SignInMethods({ auth, returnTo }: SignInMethodsProps) {
  const toast = useToast();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [busy, setBusy] = useState<Provider | null>(null);
  const logos = useRef(new Map<Provider, HTMLSpanElement>());
  const { start, leaving, overlay } = useProviderHandoff();
  // Each row's status and button wait for both answers; the rows themselves are there from the start.
  const phase = useSkeletonSwap(loaded !== null);

  const load = useCallback(() => {
    let active = true;

    // providers() never fails (it reads as none). identities can: then we say so instead of showing
    // every provider as not connected.
    void Promise.all([auth.providers(), auth.identities().catch(() => null)]).then(([providers, identities]) => {
      if (active) {
        setLoaded({ providers, identities });
      }
    });

    return () => {
      active = false;
    };
  }, [auth]);

  useEffect(() => load(), [load]);

  async function connect(provider: Provider) {
    start(provider, logos.current.get(provider) ?? null, await auth.startProviderSignIn(provider, { returnTo, intent: "link" }));
  }

  async function disconnect(provider: Provider) {
    setBusy(provider);

    try {
      await auth.disconnect(provider);
      setLoaded((current) => current && { ...current, identities: current.identities?.filter((identity) => identity.provider !== provider) ?? null });
      toast.add({ title: `${PROVIDER_NAME[provider]} disconnected.`, description: "You can connect it again any time." });
    } catch {
      toast.add({ title: `We couldn't disconnect ${PROVIDER_NAME[provider]}.`, description: "Check your connection and try again." });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div aria-busy={phase !== "content" || undefined} className="flex flex-col gap-3 rounded-2xl border bg-card p-6">
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
          const identity = loaded?.identities?.find((item) => item.provider === provider);
          // Unknown until loaded; then off when this server hasn't configured the provider.
          const available = loaded?.providers.includes(provider) ?? false;
          const known = loaded !== null && loaded.identities !== null;

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
              detail={phase === "content" ? identity?.email : undefined}
              actions={phase}
            >
              {identity !== undefined && (
                <span className="flex items-center gap-1.5 text-xs font-medium text-leaf">
                  <CheckCircleIcon weight="fill" aria-hidden className="size-4" />
                  Connected
                </span>
              )}
              {known && !available && identity === undefined && <span className="text-xs text-muted-foreground">Not available</span>}
              {/* One button per row, so focus stays on it when it turns from Disconnect into Connect. */}
              <Button
                tone="cloud"
                size="sm"
                loading={busy === provider}
                disabled={!known || leaving !== null || (!available && identity === undefined)}
                aria-label={identity === undefined ? `Connect ${PROVIDER_NAME[provider]}` : `Disconnect ${PROVIDER_NAME[provider]}`}
                onClick={() => void (identity === undefined ? connect(provider) : disconnect(provider))}
              >
                {identity === undefined ? "Connect" : "Disconnect"}
              </Button>
            </MethodRow>
          );
        })}
      </ul>
      {loaded !== null && loaded.identities === null && (
        <p aria-live="polite" className="text-sm text-muted-foreground">
          We couldn't check which accounts are connected.{" "}
          <button
            type="button"
            onClick={() => {
              setLoaded(null);
              load();
            }}
            className="rounded-sm font-medium text-link underline-offset-4 outline-hidden hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-ring"
          >
            Try again
          </button>
        </p>
      )}
      <p aria-live="polite" className="sr-only">
        {leaving === null ? (phase === "content" ? "Sign-in methods loaded" : "") : `Connecting to ${PROVIDER_NAME[leaving]}`}
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
  /** Loading: the actions' place is held (a skeleton after a moment), so nothing moves when they arrive. */
  actions?: SwapPhase;
  children: ReactNode;
};

function MethodRow({ icon, label, detail, actions = "content", children }: MethodRowProps) {
  return (
    <li className="flex min-h-16 items-center gap-3 py-3">
      <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-muted text-foreground">
        {icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm">{label}</span>
        {detail !== undefined && <span className="truncate text-xs text-muted-foreground">{detail}</span>}
      </span>
      {actions === "content" ? (
        <span className="flex shrink-0 animate-in items-center gap-3 duration-300 ease-out-soft fade-in motion-reduce:animate-none">{children}</span>
      ) : (
        <span aria-hidden className="flex h-9 w-28 shrink-0 items-center justify-end">
          {actions === "skeleton" && <SkeletonBlock className="h-9 w-24" />}
        </span>
      )}
    </li>
  );
}
