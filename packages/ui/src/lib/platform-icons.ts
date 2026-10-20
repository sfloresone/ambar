// One icon per platform, shared by "Get Ambar" and the composer's "Keep on" devices.
import type { PlatformId } from "@ambar/core";
import { DesktopIcon, DeviceMobileIcon, GlobeIcon, PuzzlePieceIcon, type Icon } from "@phosphor-icons/react";

export const PLATFORM_ICONS: Record<PlatformId, Icon> = {
  web: GlobeIcon,
  extension: PuzzlePieceIcon,
  mobile: DeviceMobileIcon,
  desktop: DesktopIcon,
};
