import manifest from "../assets/dither-sequence/manifest.json";

const assets = import.meta.glob<string>("../assets/dither-sequence/*/*.webp", {
  eager: true,
  query: "?url",
  import: "default",
});

export const ditherProfiles = [
  { id: "original", label: "Original", description: "The twelve photos without dithering, for comparison." },
  { id: "fine", label: "Fine grain", description: "An 8×8 ordered pattern that keeps the photo's colors and fine detail." },
  { id: "graphic", label: "Graphic grain", description: "A 4×4 ordered pattern with larger pixels and a stronger final texture." },
  { id: "print", label: "Sky print", description: "An 8×8 ordered pattern in ink, cloud and sky, blended with the original photo." },
  { id: "live", label: "Live shader", description: "Adjust Paper's ImageDithering in real time with the Ambar palette and a progression across all twelve frames." },
] as const;

export type DitherProfileId = (typeof ditherProfiles)[number]["id"];

export const ditherFrames = manifest.sources.map((source) => {
  const filename = `frame-${String(source.frame).padStart(2, "0")}.webp`;

  return {
    name: source.name,
    originalFrame: source.originalFrame,
    sourceUrl: source.url,
    sources: ditherProfiles.map((profile) => {
      const assetProfile = profile.id === "live" ? "original" : profile.id;
      const src = assets[`../assets/dither-sequence/${assetProfile}/${filename}`];

      if (!src) {
        throw new Error(`Missing ${profile.id} frame ${source.frame}`);
      }

      return { profile: profile.id, src };
    }),
  };
});

export const ditherSettings = manifest.profiles;
