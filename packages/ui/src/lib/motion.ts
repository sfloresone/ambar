// Motion tokens for JS animations (Motion). Their CSS twins are theme tokens in globals.css
// (ease-out-soft, ease-settle, ease-tactile, ease-spring, ease-shutter). Never inline an easing literal.

/** Named easing curves for Motion. */
export const EASE = {
  /** Develop / film title: fast start, long soft landing. */
  develop: [0.16, 1, 0.3, 1],
  /** Quick UI responses (cards, lists, small transitions). Same curve as ease-out-soft in CSS. */
  outSoft: [0.23, 1, 0.32, 1],
  /** The iris closing: slow in, slow out, like a lens. */
  iris: [0.7, 0, 0.3, 1],
} as const;

// Darkroom "develop": from overexposed white, flat and soft to full contrast and sharp.
export const DEVELOP_FROM = "brightness(2.2) contrast(0.25) saturate(0) blur(8px)";

export const DEVELOP_TO = "brightness(1) contrast(1) saturate(1) blur(0px)";
