import type { Moment } from "@ambar/core";

/** "Today, 09:12", "Apr 14", "Apr 14, 2025". */
export function shortDate(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);

  if (date.toDateString() === now.toDateString()) {
    return `Today, ${date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;
  }

  return date.toLocaleDateString("en-US", date.getFullYear() === now.getFullYear() ? { month: "short", day: "numeric" } : { month: "short", day: "numeric", year: "numeric" });
}

/** "0:14" */
export function duration(ms: number): string {
  const seconds = Math.round(ms / 1000);

  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/** The shape of a moment's image, as a CSS aspect-ratio, so it shows whole (never cropped by its frame). */
export function aspectOf(moment: Moment): string {
  switch (moment.kind) {
    case "photo":
      return moment.width > 0 && moment.height > 0 ? `${moment.width} / ${moment.height}` : "4 / 5";
    case "clip":
      return "4 / 5";
    case "link":
      return "1200 / 630";
    case "file":
      return "3 / 4";
  }
}

/** Where it came from, for a card's meta line. */
export function sourceOf(moment: Moment): string | undefined {
  if (moment.source !== undefined) {
    return moment.source;
  }

  if (moment.kind === "link") {
    try {
      return new URL(moment.url).hostname.replace(/^www\./, "");
    } catch {
      return undefined;
    }
  }

  return undefined;
}
