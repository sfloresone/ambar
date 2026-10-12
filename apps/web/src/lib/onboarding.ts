import { getImage } from "astro:assets";
import sky from "@/assets/moments/sky-through-leaves-1.jpeg";

/**
 * The landing's "sky through leaves" photo, encoded once: the faint, top-faded Develop backdrop behind
 * "It all starts with a moment." and the Try it demo (where it is shown in full, hence q72). One file, so a
 * visitor downloads it once and both reuse the cache. The original is ~500 KB.
 */
const photo = await getImage({ src: sky, width: 1000, format: "webp", quality: 72 });

export const skyPhoto = photo.src;

export const onboardingBackdrop = skyPhoto;
