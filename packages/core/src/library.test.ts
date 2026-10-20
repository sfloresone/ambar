import { describe, expect, test } from "bun:test";

import type { Collection } from "./collection.ts";
import { answer, countByKind, filterByKind, groupByTime, isTrashExpired, matchesFilter, normalizeTags, parseTimePhrase, queryWords, suggestTags, TRASH_DAYS, trashDaysLeft } from "./library.ts";
import type { Moment, PhotoMoment } from "./moment.ts";

// A fixed "now": Thursday 8 October 2026, noon.
const NOW = new Date(2026, 9, 8, 12);

const day = (y: number, m: number, d: number) => new Date(y, m - 1, d, 10).toISOString();

const collections: Collection[] = [
  { id: "cars", name: "Car brands", createdAt: day(2025, 1, 1), tone: "ink" },
  { id: "space", name: "Space", createdAt: day(2025, 1, 1), tone: "sky" },
];

const photo = (id: string, createdAt: string, extra: Partial<PhotoMoment> = {}): PhotoMoment => ({
  id,
  kind: "photo",
  createdAt,
  sharedWith: [],
  topics: [],
  collectionIds: [],
  mediaUrl: `${id}.png`,
  width: 1,
  height: 1,
  ...extra,
});

const moments: Moment[] = [
  photo("lumen", day(2025, 4, 14), { title: "Lumen Motors identity", topics: ["cars", "branding", "design"], collectionIds: ["cars"], source: "behance.net" }),
  photo("cafe", day(2025, 4, 20), { title: "Café menu typography", topics: ["typography", "food"] }),
  photo("orbit", day(2026, 9, 30), { title: "Starship stacking", topics: ["space", "rockets", "engineering"], collectionIds: ["space"] }),
  photo("volt", day(2026, 3, 2), { title: "Volt EV launch poster", topics: ["cars", "poster"], collectionIds: ["cars"] }),
  photo("today", day(2026, 10, 8), { title: "Pasta recipe", topics: ["recipes"] }),
];

describe("parseTimePhrase", () => {
  test("named months resolve to the most recent one, 'last' goes a year back", () => {
    expect(parseTimePhrase("that design from last April", NOW)?.label).toBe("April 2026");
    expect(parseTimePhrase("April last year", NOW)?.label).toBe("April 2025");
    expect(parseTimePhrase("April 2025", NOW)?.label).toBe("April 2025");
    expect(parseTimePhrase("in november", NOW)?.label).toBe("November 2025");
  });

  test("relative phrases", () => {
    expect(parseTimePhrase("yesterday", NOW)?.label).toBe("Yesterday");
    expect(parseTimePhrase("a week ago, about rockets", NOW)?.label).toBe("About 1 week ago");
    expect(parseTimePhrase("3 days ago", NOW)?.label).toBe("About 3 days ago");
    expect(parseTimePhrase("last month", NOW)?.label).toBe("September 2026");
    expect(parseTimePhrase("in 2024", NOW)?.label).toBe("2024");
  });

  test("no time, no range", () => {
    expect(parseTimePhrase("car brand logo", NOW)).toBeNull();
  });
});

describe("answer", () => {
  test("the owner's example: a car-brand design from April last year", () => {
    const result = answer("that car brand design I loved in April last year, I think", moments, collections, NOW);

    expect(result.best?.id).toBe("lumen");
    expect(result.reason).toBe("April 2025 · Car brands · behance.net");
    expect(result.alternatives.map((m) => m.id)).toContain("volt");
  });

  test("topic + fuzzy time: rockets about a week ago", () => {
    expect(answer("space rockets a week ago", moments, collections, NOW).best?.id).toBe("orbit");
  });

  test("nothing related, nothing found", () => {
    expect(answer("knitting patterns", moments, collections, NOW).best).toBeNull();
  });

  test("filler words don't count", () => {
    expect(queryWords("that thing I loved last April")).toEqual([]);
  });
});

describe("matchesFilter", () => {
  test("every typed word must match: title, topic, collection or kind", () => {
    expect(matchesFilter(moments[0]!, collections, "car brands")).toBe(true);
    expect(matchesFilter(moments[0]!, collections, "lumen photo")).toBe(true);
    expect(matchesFilter(moments[0]!, collections, "lumen space")).toBe(false);
  });
});

describe("groupByTime", () => {
  test("Today, This week, then months (with the year when it isn't this one)", () => {
    expect(groupByTime(moments, NOW).map((group) => group.label)).toEqual(["Today", "September", "March", "April 2025"]);
  });
});

describe("trash", () => {
  test("days left count down from TRASH_DAYS and stop at 0", () => {
    expect(trashDaysLeft(NOW.toISOString(), NOW)).toBe(TRASH_DAYS);
    expect(trashDaysLeft(new Date(NOW.getTime() - 3 * 86_400_000).toISOString(), NOW)).toBe(TRASH_DAYS - 3);
    expect(trashDaysLeft(new Date(NOW.getTime() - 45 * 86_400_000).toISOString(), NOW)).toBe(0);
  });

  test("expires exactly TRASH_DAYS after deletion", () => {
    const deleted = new Date(NOW.getTime() - TRASH_DAYS * 86_400_000);

    expect(isTrashExpired(deleted.toISOString(), NOW)).toBe(true);
    expect(isTrashExpired(new Date(deleted.getTime() + 60_000).toISOString(), NOW)).toBe(false);
  });
});

describe("suggestTags", () => {
  const kept = [photo("a", day(2026, 1, 1), { topics: ["Space", "cars"] }), photo("b", day(2026, 1, 2), { topics: ["space"] })];

  test("words from the link first, then the most used topics", () => {
    expect(suggestTags("https://www.outpacestudios.com/work/branding", kept)).toEqual(["outpacestudios", "work", "branding", "space", "cars"]);
  });

  test("file names lose their extension; chosen tags and repeats are left out", () => {
    expect(suggestTags("tiramisu-recipe_2024.jpg", kept, ["Space"])).toEqual(["tiramisu", "recipe", "cars"]);
  });

  test("never more than the limit", () => {
    expect(suggestTags("red-green-blue-pink-gold", [], [], 3)).toEqual(["red", "green", "blue"]);
  });
});

describe("normalizeTags", () => {
  test("trimmed, lowercase, no hash, no repeats", () => {
    expect(normalizeTags([" Agency ", "#agency", "", "Design"])).toEqual(["agency", "design"]);
  });
});

describe("countByKind and filterByKind", () => {
  const link: Moment = { id: "site", kind: "link", createdAt: day(2026, 1, 1), sharedWith: [], topics: [], collectionIds: [], url: "https://example.org" };
  const mixed = [...moments, link];

  test("counts every kind, with zero for kinds not kept", () => {
    expect(countByKind(mixed)).toEqual({ photo: 5, clip: 0, link: 1, file: 0 });
  });

  test("keeps only the chosen kind, in order; all returns the same list", () => {
    expect(filterByKind(mixed, "link").map((moment) => moment.id)).toEqual(["site"]);
    expect(filterByKind(mixed, "photo").map((moment) => moment.id)).toEqual(["lumen", "cafe", "orbit", "volt", "today"]);
    expect(filterByKind(mixed, "all")).toBe(mixed);
  });
});
