// "Get Ámbar": the other places Ámbar lives (extension, mobile, desktop), from @ambar/core PLATFORMS.
// Not available yet = visible but disabled, with its status; with a downloadUrl it becomes a link.
import { PLATFORMS, type PlatformId } from "@ambar/core";
import { CaretDownIcon, DesktopIcon, DeviceMobileIcon, GlobeIcon, PuzzlePieceIcon, type Icon } from "@phosphor-icons/react";

import { cn } from "../lib/utils.ts";
import { buttonVariants } from "./button.tsx";
import { MenuContent, type MenuContainer, MenuItem, MenuLinkItem, MenuRoot, MenuTrigger } from "./menu.tsx";

const ICONS: Record<PlatformId, Icon> = {
  web: GlobeIcon,
  extension: PuzzlePieceIcon,
  mobile: DeviceMobileIcon,
  desktop: DesktopIcon,
};

/** Everything except the web app, which is where this menu lives. */
const ELSEWHERE = PLATFORMS.filter((platform) => platform.id !== "web");

export function GetAmbarMenu({ container }: { container?: MenuContainer }) {
  return (
    <MenuRoot>
      <MenuTrigger className={buttonVariants({ tone: "cloud", size: "sm", className: "group rounded-full" })}>
        Get Ámbar
        <CaretDownIcon weight="bold" aria-hidden className="transition-transform duration-200 ease-out-soft group-data-popup-open:rotate-180 motion-reduce:transition-none" />
      </MenuTrigger>
      <MenuContent align="end" container={container} className="w-80">
        {ELSEWHERE.map((platform) => {
          const PlatformIcon = ICONS[platform.id];

          const content = (
            <>
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-muted text-ink">
                <PlatformIcon weight="bold" aria-hidden />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-medium">{platform.name}</span>
                <span className="text-xs text-pretty text-muted-foreground">{platform.tagline}</span>
              </span>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                  platform.status === "At launch" ? "bg-leaf text-cloud" : "bg-sky text-ink",
                )}
              >
                {platform.downloadUrl === undefined ? platform.status : "Get"}
              </span>
            </>
          );

          return platform.downloadUrl === undefined ? (
            <MenuItem key={platform.id} disabled>
              {content}
            </MenuItem>
          ) : (
            <MenuLinkItem key={platform.id} href={platform.downloadUrl} target="_blank" rel="noreferrer">
              {content}
            </MenuLinkItem>
          );
        })}
      </MenuContent>
    </MenuRoot>
  );
}
