/** Saved from the owner's Live shader screenshot on 2026-10-07. */
export const SIGN_IN_DITHER = {
  shader: "Paper ImageDithering @paper-design/shaders-react@0.0.81",
  width: 600,
  height: 800,
  fps: 4,
  loop: true,
  config: {
    type: "8x8",
    originalColors: true,
    inverted: false,
    back: "ink",
    front: "sky",
    highlight: "cloud",
    size: [0.65, 1.8],
    colorSteps: [7, 2],
    opacity: [0.12, 0.9],
  },
  palette: { ink: "#141414", cloud: "#ffffff", sky: "#93bbcb", leaf: "#537234" },
} as const;
