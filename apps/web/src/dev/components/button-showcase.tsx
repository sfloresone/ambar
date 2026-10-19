import {
  BookmarkSimpleIcon,
  CheckIcon,
  DownloadSimpleIcon,
  PlusIcon,
  ShareNetworkIcon,
  TrashIcon,
  XIcon,
} from "@phosphor-icons/react";

import { Button } from "@ambar/ui/components/button";
import { PROVIDER_NAME, ProviderLogo } from "@ambar/ui/components/provider-logo";

type ButtonShowcaseProps = {
  group: "tones" | "sizes" | "icons" | "icon-only" | "states" | "providers";
};

export function ButtonShowcase({ group }: ButtonShowcaseProps) {
  if (group === "providers") {
    return (
      <>
        {(["google", "github"] as const).map((provider) => (
          <Button key={provider} tone="cloud" size="lg">
            <ProviderLogo provider={provider} />
            Continue with {PROVIDER_NAME[provider]}
          </Button>
        ))}
      </>
    );
  }

  if (group === "tones") {
    return (
      <>
        <Button tone="ink">Keep a moment</Button>
        <Button tone="leaf">Save</Button>
        <Button tone="sky">Share</Button>
        <Button tone="cloud">Cancel</Button>
        <Button tone="danger">Delete</Button>
      </>
    );
  }

  if (group === "sizes") {
    return (
      <>
        <Button size="sm">Small</Button>
        <Button size="md">Medium</Button>
        <Button size="lg">Large</Button>
      </>
    );
  }

  if (group === "icons") {
    return (
      <>
        <Button tone="ink">
          <PlusIcon weight="bold" />
          Keep a moment
        </Button>
        <Button tone="leaf">
          <CheckIcon weight="bold" />
          Save
        </Button>
        <Button tone="sky">
          <ShareNetworkIcon weight="bold" />
          Share
        </Button>
        <Button tone="cloud">
          <DownloadSimpleIcon weight="bold" />
          Download
        </Button>
      </>
    );
  }

  if (group === "icon-only") {
    return (
      <>
        <Button size="icon-sm" tone="cloud" aria-label="Close">
          <XIcon weight="bold" />
        </Button>
        <Button size="icon" tone="cloud" aria-label="Keep">
          <BookmarkSimpleIcon weight="bold" />
        </Button>
        <Button size="icon" tone="sky" aria-label="Share">
          <ShareNetworkIcon weight="bold" />
        </Button>
        <Button size="icon" tone="leaf" aria-label="Save">
          <CheckIcon weight="bold" />
        </Button>
        <Button size="icon" tone="danger" aria-label="Delete">
          <TrashIcon weight="bold" />
        </Button>
        <Button size="icon-lg" tone="ink" aria-label="Keep a moment">
          <PlusIcon weight="bold" />
        </Button>
      </>
    );
  }

  return (
    <>
      <Button tone="ink" disabled>
        Disabled
      </Button>
      <Button tone="cloud" disabled>
        Disabled
      </Button>
      <Button tone="ink" loading>
        Uploading
      </Button>
      <Button tone="leaf" loading>
        Saving
      </Button>
    </>
  );
}
