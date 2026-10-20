// "Continue with Google / GitHub": tactile cloud keys with the providers' logos, shown only for the
// providers the API has configured. Choosing one plays the provider handoff (the iris closes onto its
// logo) and leaves for the provider, which sends the browser back to returnTo with the result.
import type { AuthClient, Provider } from "@ambar/core";
import { useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { cn } from "../lib/utils.ts";
import { Button } from "./button.tsx";
import { SkeletonBlock, SkeletonSwap } from "./skeleton-swap.tsx";
import { useProviderHandoff } from "./provider-handoff.tsx";
import { PROVIDER_NAME, ProviderLogo } from "./provider-logo.tsx";

type ProviderButtonsProps = {
  auth: AuthClient;
  /** Where the provider sends the browser back (with ?oauth= or ?error=). */
  returnTo: string;
  className?: string;
};

export function ProviderButtons({ auth, returnTo, className }: ProviderButtonsProps) {
  // null while asking the API which providers it has.
  const [providers, setProviders] = useState<Provider[] | null>(null);
  const logos = useRef(new Map<Provider, HTMLSpanElement>());
  const { start, leaving, overlay } = useProviderHandoff();
  // With motion the iris covers the button as it leaves; without it, the key shows it is on its way.
  const reduceMotion = useReducedMotion() === true;

  useEffect(() => {
    let active = true;

    void auth.providers().then((list) => {
      if (active) {
        setProviders(list);
      }
    });

    return () => {
      active = false;
    };
  }, [auth]);

  // None configured: nothing to offer, and nothing to reserve.
  if (providers?.length === 0) {
    return null;
  }

  async function choose(provider: Provider) {
    start(provider, logos.current.get(provider) ?? null, await auth.startProviderSignIn(provider, { returnTo }));
  }

  return (
    // The divider and two keys' worth of space is held while loading, so the form never shifts.
    <SkeletonSwap ready={providers !== null} label="Sign-in options" skeleton={<ProviderButtonsSkeleton />} className={cn(providers === null && "min-h-35", className)}>
      <div className="flex flex-col gap-4">
        <p className="flex items-center gap-3 text-xs text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">or</p>
        <div className="flex flex-col gap-3">
          {providers?.map((provider) => (
            <Button key={provider} tone="cloud" size="lg" loading={reduceMotion && leaving === provider} disabled={leaving !== null && leaving !== provider} onClick={() => void choose(provider)}>
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
              Continue with {PROVIDER_NAME[provider]}
            </Button>
          ))}
        </div>
        <p aria-live="polite" className="sr-only">
          {leaving === null ? "" : `Connecting to ${PROVIDER_NAME[leaving]}`}
        </p>
        {overlay}
      </div>
    </SkeletonSwap>
  );
}

function ProviderButtonsSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <SkeletonBlock className="mx-auto h-4 w-6" />
      <div className="flex flex-col gap-3">
        <SkeletonBlock className="h-12 rounded-xl" />
        <SkeletonBlock className="h-12 rounded-xl" />
      </div>
    </div>
  );
}
