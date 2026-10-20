// The mock library: believable moments for designing the app before storage and the agent exist. Same
// contract as the real client (LibraryClient), so the UI never knows the difference. State lives in
// memory for the session; ask() runs the shared ranking from @ambar/core with a little latency.
import { answer, isTrashExpired, normalizeTags, type Collection, type Kept, type KeepInput, type LibraryClient, type LinkMoment, type Moment, type MomentKeeper } from "@ambar/core";

import amberCapture from "../assets/link-captures/amber-640.webp?url";
import exampleCapture from "../assets/link-captures/example-640.webp?url";
import w3cCapture from "../assets/link-captures/w3c-640.webp?url";
import { placeholderArt, type ArtStyle } from "./placeholder-art.ts";
import { wait } from "./wait.ts";

const INK = "#141414";

const CLOUD = "#ffffff";

const SKY = "#93bbcb";

const LEAF = "#537234";

const PAPER = "#f4f2ee";

const DAY_MS = 24 * 60 * 60 * 1000;

/** n days before now, at a believable hour. */
function daysAgo(days: number, hour = 11): string {
  const date = new Date(Date.now() - days * DAY_MS);

  date.setHours(hour, (days * 7) % 60, 0, 0);

  return date.toISOString();
}

/** A fixed past date (month is 1-based). */
function on(year: number, month: number, day: number): string {
  return new Date(year, month - 1, day, 18, 20).toISOString();
}

const COLLECTIONS: Collection[] = [
  { id: "recipes", name: "Recipes", createdAt: on(2024, 11, 2), tone: "leaf" },
  { id: "cars", name: "Car brands", createdAt: on(2025, 2, 10), tone: "ink" },
  { id: "space", name: "Space", createdAt: on(2025, 6, 1), tone: "sky" },
  { id: "sets", name: "DJ sets", createdAt: on(2025, 1, 15), tone: "cloud" },
  { id: "architecture", name: "Architecture", createdAt: on(2025, 3, 3), tone: "sky" },
];

type Seed = {
  id: string;
  kind: Moment["kind"];
  createdAt: string;
  title: string;
  topics: string[];
  collectionIds?: string[];
  source?: string;
  readings?: string;
  note?: string;
  keptBy?: MomentKeeper;
  art?: { style: ArtStyle; subtitle?: string; bg: string; fg: string; accent: string; width?: number; height?: number };
  url?: string;
  /** Links: the page's subtitle. */
  description?: string;
  /** Links: a real capture of the page (else the generated art stands in). */
  capture?: string;
  /** Links: frameable (the server checked); absent = opens in the browser. */
  embed?: "page";
  pages?: number;
  durationMs?: number;
};

const SEEDS: Seed[] = [
  { id: "m-wiki-amber", kind: "link", createdAt: daysAgo(0, 7), title: "Amber · Wikipedia", topics: ["amber", "resin", "fossils", "nature"], source: "en.wikipedia.org", url: "https://en.wikipedia.org/wiki/Amber", description: "Fossilized tree resin, valued for its color and for the moments it keeps: insects, leaves and air bubbles from millions of years ago.", capture: amberCapture, embed: "page" },
  { id: "m-w3c", kind: "link", createdAt: daysAgo(4, 15), title: "World Wide Web Consortium", topics: ["web", "standards", "code"], source: "www.w3.org", url: "https://www.w3.org/", description: "The organisation that develops the open standards of the web: HTML, CSS, accessibility.", capture: w3cCapture, embed: "page" },
  { id: "m-example", kind: "link", createdAt: daysAgo(9, 10), title: "Example Domain", topics: ["web", "reference"], source: "example.org", url: "https://example.org/", description: "A domain reserved for use in documentation examples.", capture: exampleCapture, embed: "page" },
  { id: "m-pasta", kind: "photo", createdAt: daysAgo(0, 9), title: "Pasta al limone", topics: ["recipes", "pasta", "food"], collectionIds: ["recipes"], source: "Instagram", readings: "zest of 2 lemons, 200 ml cream, parmesan", art: { style: "plate", bg: PAPER, fg: "#e8dcc4", accent: "#d9b54a" } },
  { id: "m-sc-set", kind: "link", description: "Two hours of warm deep house recorded at sunset. 128 bpm.", createdAt: daysAgo(0, 8), title: "Sunset deep house set — Ibiza 2026", topics: ["music", "house", "dj"], collectionIds: ["sets"], source: "soundcloud.com", url: "https://soundcloud.com/example/sunset-deep-house", art: { style: "wave", subtitle: "1:42:10 · 128 bpm", bg: INK, fg: CLOUD, accent: "#f07a2a", width: 1200, height: 630 } },
  { id: "m-onboarding", kind: "photo", createdAt: daysAgo(1, 16), title: "Onboarding flow — fintech app", topics: ["ui", "design", "mobile"], source: "dribbble.com", readings: "Create your account Continue with email", art: { style: "type", subtitle: "Screens 01–06", bg: "#eef3f5", fg: INK, accent: SKY } },
  { id: "m-ceiling", kind: "clip", createdAt: daysAgo(2, 19), title: "Timber ceiling detail", topics: ["architecture", "wood", "detail"], collectionIds: ["architecture"], durationMs: 14_000, art: { style: "plan", subtitle: "Site visit", bg: "#ece4d6", fg: "#4a3b2a", accent: LEAF } },
  { id: "m-api-pdf", kind: "file", createdAt: daysAgo(3, 10), title: "API design guidelines", topics: ["code", "api", "docs"], pages: 24, readings: "versioning pagination idempotency error codes", art: { style: "page", subtitle: "Engineering handbook · v3", bg: CLOUD, fg: INK, accent: SKY } },
  { id: "m-starship", kind: "photo", createdAt: daysAgo(7, 22), title: "Starship stacking at dusk", topics: ["space", "rockets", "engineering"], collectionIds: ["space"], source: "x.com", readings: "Starbase full stack", art: { style: "orbit", bg: "#0e1726", fg: CLOUD, accent: SKY } },
  { id: "m-nozzle", kind: "link", description: "Why rocket nozzles are bell-shaped, and what expansion ratio means for thrust.", createdAt: daysAgo(8, 13), title: "How rocket engine nozzles work", topics: ["space", "rockets", "engineering", "physics"], collectionIds: ["space"], source: "everydayastronaut.com", url: "https://everydayastronaut.com/rocket-nozzles", art: { style: "orbit", bg: INK, fg: CLOUD, accent: "#f07a2a", width: 1200, height: 630 } },
  { id: "m-bread", kind: "clip", createdAt: daysAgo(11, 8), title: "Sourdough shaping", topics: ["recipes", "bread", "baking"], collectionIds: ["recipes"], source: "TikTok", durationMs: 28_000, art: { style: "plate", bg: "#f1e7d8", fg: "#d6b98c", accent: "#a8743c" } },
  { id: "m-nails", kind: "photo", createdAt: daysAgo(15, 18), title: "Chrome nails, soft sage", topics: ["beauty", "nails", "aesthetic"], source: "Pinterest", art: { style: "type", subtitle: "Spring palette", bg: "#e6ece2", fg: LEAF, accent: "#c9d5c1" } },
  { id: "m-vinyl", kind: "link", description: "The 1986 Trax Records release, with credits, pressings and marketplace listings.", createdAt: daysAgo(20, 21), title: "Discogs — Larry Heard, Can You Feel It", topics: ["music", "vinyl", "house"], collectionIds: ["sets"], source: "discogs.com", url: "https://www.discogs.com/release/example", art: { style: "wave", subtitle: "Trax Records · 1986", bg: "#1d1d1d", fg: "#e5e5e5", accent: SKY, width: 1200, height: 630 } },
  { id: "m-house-plan", kind: "file", createdAt: daysAgo(34, 12), title: "Casa Patio — ground floor", topics: ["architecture", "plan", "house"], collectionIds: ["architecture"], pages: 6, readings: "patio living kitchen 1:100", art: { style: "plan", subtitle: "1:100 · Rev C", bg: CLOUD, fg: INK, accent: LEAF } },
  { id: "m-volt", kind: "photo", createdAt: on(2026, 3, 2), title: "Volt EV launch poster", topics: ["cars", "poster", "design"], collectionIds: ["cars"], source: "behance.net", art: { style: "wordmark", subtitle: "Electric. Effortless.", bg: SKY, fg: INK, accent: INK } },
  { id: "m-moodboard", kind: "photo", createdAt: on(2026, 1, 19), title: "Brutalist interiors moodboard", topics: ["architecture", "interiors", "concrete"], collectionIds: ["architecture"], source: "are.na", art: { style: "plan", subtitle: "Moodboard", bg: "#d9d9d6", fg: "#3a3a3a", accent: "#8a8a85" } },
  { id: "m-react-snippet", kind: "link", description: "Extract non-reactive logic from an effect so it always reads the latest props and state.", createdAt: on(2025, 11, 4), title: "useEffectEvent — React docs", topics: ["code", "react"], source: "react.dev", url: "https://react.dev/reference/react/useEffectEvent", art: { style: "type", subtitle: "Reference", bg: "#23272f", fg: "#e6e6e6", accent: "#58c4dc", width: 1200, height: 630 } },
  { id: "m-lumen", kind: "photo", createdAt: on(2025, 4, 14), title: "Lumen Motors — brand identity", topics: ["cars", "branding", "design", "logo"], collectionIds: ["cars"], source: "behance.net", readings: "LUMEN Motors Drive the light", note: "The way the L becomes a headlight.", art: { style: "wordmark", subtitle: "Drive the light", bg: INK, fg: CLOUD, accent: SKY } },
  { id: "m-cafe-type", kind: "photo", createdAt: on(2025, 4, 22), title: "Café menu typography", topics: ["typography", "food", "design"], source: "Instagram", art: { style: "type", subtitle: "Serif menu board", bg: PAPER, fg: "#2b2b2b", accent: "#c56b3c" } },
  { id: "m-porsche", kind: "link", description: "How the crest came to be in 1952, and how it changed across the 911's generations.", createdAt: on(2025, 4, 3), title: "Heritage design: Porsche 911 crest history", topics: ["cars", "design", "history"], collectionIds: ["cars"], source: "porsche.com", url: "https://newsroom.porsche.com/example", art: { style: "wordmark", subtitle: "Since 1952", bg: "#7a1d1d", fg: "#f3e6c8", accent: "#d9b54a", width: 1200, height: 630 } },
  { id: "m-moon", kind: "photo", createdAt: on(2025, 7, 20), title: "Moon landing anniversary print", topics: ["space", "poster", "history"], collectionIds: ["space"], source: "nasa.gov", art: { style: "orbit", bg: "#111", fg: "#f1f1f1", accent: "#d9b54a" } },
  { id: "m-tiramisu", kind: "file", createdAt: on(2025, 12, 23), title: "Grandma's tiramisu", topics: ["recipes", "dessert"], collectionIds: ["recipes"], pages: 1, readings: "mascarpone savoiardi espresso cocoa", art: { style: "page", subtitle: "Christmas 2025", bg: PAPER, fg: "#3b2a20", accent: "#c8a27a" } },
  { id: "m-boiler", kind: "link", description: "Peggy Gou's Boiler Room set, recorded live.", createdAt: on(2025, 9, 9), title: "Boiler Room: Peggy Gou", topics: ["music", "dj", "techno"], collectionIds: ["sets"], source: "youtube.com", url: "https://www.youtube.com/watch?v=example", art: { style: "wave", subtitle: "Live set", bg: "#111", fg: CLOUD, accent: "#f5d04c", width: 1200, height: 630 } },
];

function seedToMoment(seed: Seed): Moment {
  const base = {
    id: seed.id,
    createdAt: seed.createdAt,
    sharedWith: [],
    keptBy: seed.keptBy,
    onCanvas: seed.collectionIds?.includes("cars") === true,
    title: seed.title,
    topics: seed.topics,
    collectionIds: seed.collectionIds ?? [],
    source: seed.source,
    readings: seed.readings,
    note: seed.note,
  };

  const art = seed.art === undefined ? undefined : placeholderArt({ title: seed.title.split(" — ")[0] ?? seed.title, ...seed.art });

  switch (seed.kind) {
    case "photo":
      return { ...base, kind: "photo", mediaUrl: art ?? "", width: seed.art?.width ?? 800, height: seed.art?.height ?? 1000 };
    case "clip":
      return { ...base, kind: "clip", mediaUrl: art ?? "", posterUrl: art, durationMs: seed.durationMs ?? 10_000 };
    case "link": {
      const link: LinkMoment = { ...base, kind: "link", url: seed.url ?? "https://example.com", imageUrl: seed.capture ?? art };

      if (seed.description !== undefined) {
        link.description = seed.description;
      }

      if (seed.embed !== undefined && seed.url !== undefined) {
        link.embed = { kind: seed.embed, url: seed.url };
      }

      return link;
    }

    case "file":
      return { ...base, kind: "file", mediaUrl: art ?? "", name: `${seed.title}.pdf`, mimeType: "application/pdf", size: 1_400_000, pages: seed.pages, previewUrl: art };
  }
}

/** Words in a new moment that point to a collection, for the one-tap suggestion. */
const TOPIC_HINTS: [RegExp, string, string[]][] = [
  [/soundcloud|mixcloud|discogs|beatport|boiler|set|mix/i, "sets", ["music"]],
  [/recipe|pasta|cake|bread|cook|kitchen|tiramisu/i, "recipes", ["recipes", "food"]],
  [/rocket|space|nasa|starship|orbit|moon|mars/i, "space", ["space"]],
  [/car|motor|porsche|tesla|ev\b|auto/i, "cars", ["cars"]],
  [/plan|floor|archi|house|interior|facade/i, "architecture", ["architecture"]],
];

function kindOfFile(type: string): Moment["kind"] {
  if (type.startsWith("image/")) return "photo";

  if (type.startsWith("video/")) return "clip";

  return "file";
}

export function createMockLibrary(): LibraryClient<File> {
  // Two moments already in the Trash, so it has something to show: one recent, one about to go.
  const trashed = new Map([
    ["m-cafe-type", daysAgo(3)],
    ["m-nails", daysAgo(27)],
  ]);

  let moments: Moment[] = SEEDS.map(seedToMoment).map((moment) => {
    const deletedAt = trashed.get(moment.id);

    return deletedAt === undefined ? moment : { ...moment, deletedAt };
  });

  let collections = [...COLLECTIONS];

  const kept = () => moments.filter((moment) => moment.deletedAt === undefined);

  function update(momentId: string, change: (moment: Moment) => Moment): Moment {
    const moment = moments.find((item) => item.id === momentId);

    if (moment === undefined) {
      throw new Error("That moment is gone.");
    }

    const updated = change(moment);

    moments = moments.map((item) => (item.id === momentId ? updated : item));

    return updated;
  }

  function suggest(text: string) {
    const hint = TOPIC_HINTS.find(([pattern]) => pattern.test(text));

    return { topics: hint?.[2] ?? [], suggestion: collections.find((collection) => collection.id === hint?.[1]) };
  }

  return {
    async listMoments() {
      await wait(250);

      return kept();
    },
    async listTrash() {
      // Time's up for some: erase them, as the server will.
      moments = moments.filter((moment) => moment.deletedAt === undefined || !isTrashExpired(moment.deletedAt));

      return moments.filter((moment) => moment.deletedAt !== undefined).toSorted((a, b) => Date.parse(b.deletedAt ?? "") - Date.parse(a.deletedAt ?? ""));
    },
    async listCollections() {
      return collections;
    },
    async ask(query) {
      // Marked so tests can count agent calls (searching must never make one).
      performance.mark("ambar:ask");
      await wait(900);

      return answer(query, kept(), collections);
    },
    async keep(input: KeepInput<File>): Promise<Kept> {
      await wait(400);

      // What the person added while keeping: their tags join the topics, collections and note as given.
      const tags = normalizeTags(input.tags ?? []);
      const chosen = input.collectionIds ?? [];
      const base = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), sharedWith: [], collectionIds: chosen, note: input.note?.trim() || undefined };
      const withTags = (found: string[]) => [...new Set([...tags, ...found])];
      // A collection chosen here needs no suggestion afterwards.
      const offer = (suggestion: Collection | undefined) => (chosen.length > 0 ? undefined : suggestion);

      if ("url" in input) {
        const host = new URL(input.url).hostname.replace(/^www\./, "");
        const { topics, suggestion } = suggest(input.url);
        const moment: Moment = { ...base, kind: "link", url: input.url, title: host, source: host, topics: withTags(topics) };

        moments = [moment, ...moments];

        return { moment, suggestion: offer(suggestion) };
      }

      const { file } = input;
      const url = URL.createObjectURL(file);
      const title = file.name.replace(/\.[^.]+$/, "").replaceAll(/[-_]+/g, " ");
      const { topics, suggestion } = suggest(file.name);
      const kind = kindOfFile(file.type);
      let moment: Moment;

      if (kind === "photo") {
        moment = { ...base, kind, mediaUrl: url, width: 0, height: 0, title, topics: withTags(topics) };
      } else if (kind === "clip") {
        moment = { ...base, kind, mediaUrl: url, durationMs: 0, title, topics: withTags(topics) };
      } else {
        const preview = placeholderArt({ style: "page", title, subtitle: file.type || "Document", bg: CLOUD, fg: INK, accent: SKY });

        moment = { ...base, kind: "file", mediaUrl: url, name: file.name, mimeType: file.type, size: file.size, previewUrl: preview, title, topics: withTags(topics) };
      }

      moments = [moment, ...moments];

      return { moment, suggestion: offer(suggestion) };
    },
    async createCollection(name) {
      const collection: Collection = { id: crypto.randomUUID(), name, createdAt: new Date().toISOString(), tone: (["sky", "leaf", "ink", "cloud"] as const)[collections.length % 4] ?? "sky" };

      collections = [...collections, collection];

      return collection;
    },
    async setCollections(momentId, collectionIds) {
      return update(momentId, (moment) => ({ ...moment, collectionIds }));
    },
    async renameMoment(momentId, title) {
      const trimmed = title.trim();

      if (trimmed === "" || trimmed.length > 200) {
        throw new Error("Use a title between 1 and 200 characters.");
      }

      return update(momentId, (moment) => ({ ...moment, title: trimmed }));
    },
    async setCanvas(momentId, included) {
      return update(momentId, (moment) => ({ ...moment, onCanvas: included }));
    },
    async deleteMoment(momentId) {
      return update(momentId, (moment) => ({ ...moment, deletedAt: new Date().toISOString() }));
    },
    async restoreMoment(momentId) {
      return update(momentId, ({ deletedAt: _restored, ...moment }) => moment);
    },
    async purgeMoment(momentId) {
      moments = moments.filter((item) => item.id !== momentId);
    },
    async emptyTrash() {
      moments = kept();
    },
  };
}
