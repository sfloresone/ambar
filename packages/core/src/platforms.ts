/** Where Ámbar lives. One list for the landing's Platforms section and the app's "Get Ámbar" menu. */

export type PlatformId = "web" | "extension" | "mobile" | "desktop";

export type PlatformStatus = "At launch" | "Later";

export type Platform = {
  id: PlatformId;
  name: string;
  status: PlatformStatus;
  /** Short line for menus. */
  tagline: string;
  /** Longer description for the landing. */
  text: string;
  /** Where to get it. Until it exists, menus show the platform as not available yet. */
  downloadUrl?: string;
};

export const PLATFORMS: Platform[] = [
  {
    id: "web",
    name: "Web",
    status: "At launch",
    tagline: "Your moments in any browser.",
    text: "Keep and revisit your moments from any browser. Everything you keep elsewhere is waiting here, in one place.",
  },
  {
    id: "extension",
    name: "Browser extension",
    status: "At launch",
    tagline: "Keep while you browse.",
    text: "Keep a page, an image or a link in one click while you browse, without leaving what you are doing.",
  },
  {
    id: "mobile",
    name: "Mobile",
    status: "Later",
    tagline: "From the camera or the share menu. Android first.",
    text: "Keep a moment straight from the camera or the share menu, the second it happens. Android first.",
  },
  {
    id: "desktop",
    name: "Desktop",
    status: "Later",
    tagline: "One shortcut away.",
    text: "A dedicated app, one shortcut away, for the moments that happen on your screen.",
  },
];
