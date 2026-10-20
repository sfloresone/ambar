// Where a moment can be kept. Prototype: the list is simulated and nothing syncs yet; the real one will
// come from the API (one entry per signed-in device). Whether a device can be chosen follows PLATFORMS.
import { PLATFORMS, type PlatformId } from "./platforms.ts";

export type Device = {
  id: string;
  name: string;
  platform: PlatformId;
  /** The device the person is using now: what they keep is always there. */
  current?: boolean;
  /** Its platform exists today ("At launch"); otherwise it shows its status and can't be chosen. */
  available: boolean;
};

const isAvailable = (platform: PlatformId) => PLATFORMS.find((item) => item.id === platform)?.status === "At launch";

const device = (id: string, name: string, platform: PlatformId, current = false): Device => ({ id, name, platform, current, available: isAvailable(platform) });

export const MOCK_DEVICES: Device[] = [
  device("this-browser", "This browser", "web", true),
  device("chrome-extension", "Chrome", "extension"),
  device("pixel", "Pixel 9", "mobile"),
  device("macbook", "MacBook Pro", "desktop"),
];
