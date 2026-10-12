// The library: what a person keeps, how it is found again. Pure logic (search, time phrases, grouping)
// lives here so every client (web, desktop, extension, mobile, an agent) behaves the same.
import type { Collection } from "./collection.ts";
import type { MomentFile } from "./upload.ts";
import type { Moment, MomentKind } from "./moment.ts";

/** What asking Ambar returns: the best match (also copied to the clipboard), others, and why. */
export type AskResult = {
  best: Moment | null;
  alternatives: Moment[];
  /** Short, human: "April 2025 · Car brands · behance.net". */
  reason: string;
};

/** Something to keep: a file (photo, clip, PDF) or a link. */
export type KeepInput<TFile extends MomentFile = MomentFile> = { file: TFile } | { url: string };

export type Kept = {
  moment: Moment;
  /** A collection that matches its topics, offered with one tap. */
  suggestion?: Collection;
};

export interface LibraryClient<TFile extends MomentFile = MomentFile> {
  /** Kept moments (not in the Trash). */
  listMoments(): Promise<Moment[]>;
  /** Moments in the Trash, most recently deleted first. */
  listTrash(): Promise<Moment[]>;
  listCollections(): Promise<Collection[]>;
  /** Natural language: time ("last April"), topic, kind, source. */
  ask(query: string): Promise<AskResult>;
  keep(input: KeepInput<TFile>): Promise<Kept>;
  createCollection(name: string): Promise<Collection>;
  setCollections(momentId: string, collectionIds: string[]): Promise<Moment>;
  /** Moves it to the Trash; it can be restored for TRASH_DAYS. */
  deleteMoment(momentId: string): Promise<Moment>;
  restoreMoment(momentId: string): Promise<Moment>;
  /** Erases it for good. */
  purgeMoment(momentId: string): Promise<void>;
  emptyTrash(): Promise<void>;
}

// ---------------------------------------------------------------------------------------------------
// Trash: deleting is reversible for a while.

/** Days a moment stays in the Trash before it is erased. */
export const TRASH_DAYS = 30;

/** Whole days left before a trashed moment is erased (0 = today, or it already expired). */
export function trashDaysLeft(deletedAt: string, now: Date = new Date()): number {
  const erasedAt = Date.parse(deletedAt) + TRASH_DAYS * DAY_MS;

  return Math.max(0, Math.ceil((erasedAt - now.getTime()) / DAY_MS));
}

/** Its time in the Trash is over: erase it. */
export function isTrashExpired(deletedAt: string, now: Date = new Date()): boolean {
  return Date.parse(deletedAt) + TRASH_DAYS * DAY_MS <= now.getTime();
}

// ---------------------------------------------------------------------------------------------------
// Time: "today", "yesterday", "last week", "a week ago", "3 days ago", "last month", "April",
// "last April", "April 2025", "last year", "in 2024".

export type TimeRange = {
  from: Date;
  to: Date;
  /** How it reads back to people: "April 2025", "Last week". */
  label: string;
};

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

const NUMBER_WORDS = new Map([["a", 1], ["an", 1], ["one", 1], ["two", 2], ["three", 3], ["four", 4], ["five", 5], ["six", 6]]);

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function monthRange(year: number, month: number): TimeRange {
  const name = new Date(year, month, 1).toLocaleString("en-US", { month: "long" });

  return { from: new Date(year, month, 1), to: new Date(year, month + 1, 1), label: `${name} ${year}` };
}

/** The time a phrase points at, or null when it names no time. */
export function parseTimePhrase(text: string, now: Date = new Date()): TimeRange | null {
  const query = text.toLowerCase();
  const today = startOfDay(now);

  if (/\btoday\b/.test(query)) {
    return { from: today, to: new Date(today.getTime() + DAY_MS), label: "Today" };
  }

  if (/\byesterday\b/.test(query)) {
    return { from: new Date(today.getTime() - DAY_MS), to: today, label: "Yesterday" };
  }

  const ago = query.match(/\b(\d+|a|an|one|two|three|four|five|six)\s+(day|week|month|year)s?\s+ago\b/);

  if (ago) {
    const amount = Number(ago[1]) || NUMBER_WORDS.get(ago[1] ?? "") || 1;
    const unit = ago[2] ?? "day";
    const days = { day: 1, week: 7, month: 30, year: 365 }[unit] ?? 1;
    const center = today.getTime() - amount * days * DAY_MS;
    // "A week ago" is never exact: half a unit either side.
    const spread = Math.max(1, (days * amount) / 2) * DAY_MS;

    return { from: new Date(center - spread), to: new Date(center + spread + DAY_MS), label: `About ${amount} ${unit}${amount > 1 ? "s" : ""} ago` };
  }

  if (/\blast week\b/.test(query)) {
    return { from: new Date(today.getTime() - 14 * DAY_MS), to: new Date(today.getTime() - 6 * DAY_MS), label: "Last week" };
  }

  if (/\bthis week\b/.test(query)) {
    return { from: new Date(today.getTime() - 6 * DAY_MS), to: new Date(today.getTime() + DAY_MS), label: "This week" };
  }

  const monthIndex = MONTHS.findIndex((month) => new RegExp(`\\b${month}\\b`).test(query));

  if (monthIndex >= 0) {
    const year = query.match(new RegExp(`\\b${MONTHS[monthIndex]}\\s+(\\d{4})\\b`))?.[1];

    if (year !== undefined) {
      return monthRange(Number(year), monthIndex);
    }

    // "April" or "last April": the most recent April that has already started, a year back for "last".
    let candidate = monthIndex <= now.getMonth() ? now.getFullYear() : now.getFullYear() - 1;

    if (/\blast\s+\w+\b/.test(query) && monthIndex === now.getMonth()) {
      candidate -= 1;
    }

    if (/\b(last year|a year ago)\b/.test(query)) {
      candidate = now.getFullYear() - 1;
    }

    return monthRange(candidate, monthIndex);
  }

  if (/\blast month\b/.test(query)) {
    return monthRange(now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear(), (now.getMonth() + 11) % 12);
  }

  if (/\bthis month\b/.test(query)) {
    return monthRange(now.getFullYear(), now.getMonth());
  }

  const year = query.match(/\bin\s+(\d{4})\b/)?.[1] ?? (/\blast year\b/.test(query) ? String(now.getFullYear() - 1) : undefined);

  if (year !== undefined) {
    return { from: new Date(Number(year), 0, 1), to: new Date(Number(year) + 1, 0, 1), label: year };
  }

  return null;
}

// ---------------------------------------------------------------------------------------------------
// Words: what a query is about. Matched against titles, topics, collections, sources and readings.

const STOPWORDS = new Set(
  "a an the that this these those i me my mine we our you your it its was were is are be been of in on at to for from with about by as and or but so some something thing things one ones which what where when who think thought maybe like liked love loved really very kept saved save keep found find show get give have had last ago year years month months week weeks day days today yesterday please".split(
    " ",
  ),
);

const KIND_WORDS = new Map<string, MomentKind>([
  ["photo", "photo"],
  ["photos", "photo"],
  ["picture", "photo"],
  ["image", "photo"],
  ["screenshot", "photo"],
  ["capture", "photo"],
  ["clip", "clip"],
  ["video", "clip"],
  ["link", "link"],
  ["article", "link"],
  ["site", "link"],
  ["website", "link"],
  ["page", "link"],
  ["pdf", "file"],
  ["document", "file"],
  ["file", "file"],
  ["plan", "file"],
  ["plans", "file"],
]);

/** The meaningful words of a query, lowercased, without time words or filler. */
export function queryWords(text: string): string[] {
  return text
    .toLowerCase()
    .replaceAll(/[^\p{L}\p{N}\s.-]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length > 1 && !STOPWORDS.has(word) && !MONTHS.includes(word) && !/^\d{4}$/.test(word));
}

/** Searchable text of a moment, with its collections' names. */
function haystack(moment: Moment, collections: Collection[]) {
  const names = collections
    .values()
    .filter((collection) => moment.collectionIds.includes(collection.id))
    .map((collection) => collection.name)
    .toArray();

  const strong = [moment.title, ...moment.topics, ...names, moment.source, moment.kind === "file" ? moment.name : undefined].join(" ").toLowerCase();

  return { strong, weak: [moment.note, moment.readings, moment.kind === "link" ? moment.url : undefined].join(" ").toLowerCase() };
}

/** Does a moment contain every word of a live filter? (Typing in the ask bar.) */
export function matchesFilter(moment: Moment, collections: Collection[], filter: string): boolean {
  const words = filter.toLowerCase().split(/\s+/).filter(Boolean);
  const { strong, weak } = haystack(moment, collections);

  return words.every((word) => strong.includes(word) || weak.includes(word) || moment.kind.startsWith(word));
}

/** How well a moment answers a question; 0 means not at all. */
export function scoreMoment(moment: Moment, collections: Collection[], words: string[], range: TimeRange | null): number {
  const { strong, weak } = haystack(moment, collections);
  let score = 0;

  for (const word of words) {
    const stem = word.length > 4 ? word.replace(/s$/, "") : word;

    if (KIND_WORDS.get(word) === moment.kind) {
      score += 2;
    } else if (strong.includes(stem)) {
      score += 3;
    } else if (weak.includes(stem)) {
      score += 1;
    }
  }

  if (range !== null) {
    const time = new Date(moment.createdAt).getTime();
    const inside = time >= range.from.getTime() && time < range.to.getTime();
    // Memory is fuzzy ("April… I think"): a month either side still counts a little.
    const near = time >= range.from.getTime() - 31 * DAY_MS && time < range.to.getTime() + 31 * DAY_MS;

    if (words.length === 0) {
      return inside ? 1 : 0;
    }

    score += inside ? 4 : near ? 1 : -3;
  }

  return Math.max(0, score);
}

/** Answer a question over a library: rank, pick the best, explain it. */
export function answer(query: string, moments: Moment[], collections: Collection[], now: Date = new Date()): AskResult {
  const range = parseTimePhrase(query, now);
  const words = queryWords(query);

  const ranked = moments
    .values()
    .map((moment) => ({ moment, score: scoreMoment(moment, collections, words, range) }))
    .filter((entry) => entry.score > 0)
    .toArray()
    .sort((a, b) => b.score - a.score || Date.parse(b.moment.createdAt) - Date.parse(a.moment.createdAt));

  const best = ranked[0]?.moment ?? null;

  return { best, alternatives: ranked.slice(1, 5).map((entry) => entry.moment), reason: best === null ? "" : explain(best, collections, range) };
}

function explain(moment: Moment, collections: Collection[], range: TimeRange | null): string {
  const date = new Date(moment.createdAt);
  const when = range?.label ?? date.toLocaleString("en-US", { month: "long", year: "numeric" });
  const collection = collections.find((item) => moment.collectionIds.includes(item.id))?.name;

  return [when, collection, moment.source].filter(Boolean).join(" · ");
}

// ---------------------------------------------------------------------------------------------------
// Timeline: groups the way memory works. Today, Yesterday, This week, then months.

export type TimeGroup = {
  label: string;
  moments: Moment[];
};

export function groupByTime(moments: Moment[], now: Date = new Date()): TimeGroup[] {
  const today = startOfDay(now).getTime();
  const groups = new Map<string, Moment[]>();
  const sorted = moments.toSorted((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  for (const moment of sorted) {
    const date = new Date(moment.createdAt);
    const time = date.getTime();
    let label: string;

    if (time >= today) {
      label = "Today";
    } else if (time >= today - DAY_MS) {
      label = "Yesterday";
    } else if (time >= today - 6 * DAY_MS) {
      label = "This week";
    } else {
      label = date.toLocaleString("en-US", date.getFullYear() === now.getFullYear() ? { month: "long" } : { month: "long", year: "numeric" });
    }

    groups.set(label, [...(groups.get(label) ?? []), moment]);
  }

  return [...groups].map(([label, items]) => ({ label, moments: items }));
}
