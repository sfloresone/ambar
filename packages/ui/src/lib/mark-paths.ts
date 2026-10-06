/** Geometry of the chosen amber mark. Colorways reuse these paths unchanged. */
export const stone =
  "M100 18c28 4 58 28 66 62 8 36-8 78-40 92-34 14-78-2-90-36C22 96 40 28 100 18z";

export const leaf = "M28 2C48 18 54 52 28 94C2 52 8 18 28 2Z";

export const veins =
  "M28 12V86M28 32L16 24M28 32L40 24M28 52L14 42M28 52L42 42M28 70L18 62M28 70L38 62";

export const leafTransform = "translate(100 108) rotate(14) scale(1.2) translate(-28 -48)";

/** Colorway and light, shared by every renderer: Astro Mark, React Mark and markSvg(). */
export const markColors = { resin: "#e09a2f", edge: "#a87416", leaf: "#537234" } as const;

/** Radial gradient of the "color" colorway, light from the top left. */
export const markGradient = {
  cx: "38%",
  cy: "32%",
  r: "70%",
  stops: [
    { offset: "0%", color: "#f4d48a" },
    { offset: "62%", color: "#e09a2f" },
    { offset: "100%", color: "#b87a18" },
  ],
} as const;

/** Light caught on the stone: a soft gloss top left and a small spark bottom right. */
export const highlight = { cx: 78, cy: 52, rx: 28, ry: 12, transform: "rotate(-24 78 52)", opacity: 0.55 } as const;

export const spark = { cx: 132, cy: 150, r: 5, opacity: 0.45 } as const;

export const veinOpacity = 0.35;
