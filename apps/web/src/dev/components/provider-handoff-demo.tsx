import { PROVIDERS, type Provider } from "@ambar/core";
import { Button } from "@ambar/ui/components/button";
import { useProviderHandoff } from "@ambar/ui/components/provider-handoff";
import { PROVIDER_NAME, ProviderLogo } from "@ambar/ui/components/provider-logo";
import { useRef, useState } from "react";

/** Replays the provider handoff without leaving: where it would navigate, it waits and starts over. */
export function ProviderHandoffDemo() {
  const [run, setRun] = useState(0);

  return <Buttons key={run} onLeave={() => window.setTimeout(() => setRun((current) => current + 1), 1500)} />;
}

function Buttons({ onLeave }: { onLeave: () => void }) {
  const logos = useRef(new Map<Provider, HTMLSpanElement>());
  const { start, overlay } = useProviderHandoff(onLeave);

  return (
    <div className="flex flex-wrap gap-3">
      {PROVIDERS.map((provider) => (
        <Button key={provider} tone="cloud" size="lg" onClick={() => start(provider, logos.current.get(provider) ?? null, "#")}>
          <span
            ref={(element) => {
              if (element !== null) {
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
      {overlay}
    </div>
  );
}
