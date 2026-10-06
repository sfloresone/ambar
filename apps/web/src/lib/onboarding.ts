import { getImage } from "astro:assets";
import sky from "@/assets/moments/sky-through-leaves-1.jpeg";

/**
 * Faint photo that develops behind "It all starts with a moment." Shown at ~32% opacity and masked,
 * so a small, low-quality WebP is plenty. Generated once at build time and shared by every CTA.
 */
const backdrop = await getImage({ src: sky, width: 1000, format: "webp", quality: 60 });

export const onboardingBackdrop = backdrop.src;
