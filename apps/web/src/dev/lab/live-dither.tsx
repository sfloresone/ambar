// Lab candidate using Paper ImageDithering (Apache-2.0): https://shaders.paper.design/image-dithering.
import { ImageDithering, type ImageDitheringProps } from "@paper-design/shaders-react";
import { Button } from "@ambar/ui/components/button";
import { useEffect, useId, useRef, useState, type CSSProperties } from "react";

const COLOR_NAMES = ["ink", "cloud", "sky", "leaf"] as const;

type BrandColor = (typeof COLOR_NAMES)[number];

type Palette = Record<BrandColor, string>;

type Range = [number, number];

const PATTERNS = ["2x2", "4x4", "8x8", "random"] as const;

export type LiveDitherConfig = {
  type: NonNullable<ImageDitheringProps["type"]>;
  originalColors: boolean;
  inverted: boolean;
  back: BrandColor;
  front: BrandColor;
  highlight: BrandColor;
  size: Range;
  colorSteps: Range;
  opacity: Range;
};

export const DEFAULT_LIVE_DITHER: LiveDitherConfig = {
  type: "8x8", originalColors: false, inverted: false,
  back: "ink", front: "leaf", highlight: "sky",
  size: [0.65, 1.8], colorSteps: [7, 2], opacity: [0.12, 0.9],
};

const FIELD = "w-full rounded-lg border bg-background px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-ring";

const RANGE_FOCUS = "accent-leaf focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-4 focus-visible:outline-ring";

const SWATCHES = { ink: "bg-ink", cloud: "bg-cloud", sky: "bg-sky", leaf: "bg-leaf" };

export function readDitherEnvironment() {
  const tokens = getComputedStyle(document.documentElement);
  const color = (name: BrandColor) => tokens.getPropertyValue(`--color-${name}`).trim();
  const palette: Palette = { ink: color("ink"), cloud: color("cloud"), sky: color("sky"), leaf: color("leaf") };
  let supported = false;

  try {
    const gl = document.createElement("canvas").getContext("webgl2");

    supported = gl !== null;
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    // Browser policy or GPU availability can prevent context creation.
  }

  return { palette, supported };
}

export function liveDitherSettings(config: LiveDitherConfig, palette: Palette, frame: number) {
  const progress = frame / 11;
  const interpolate = ([start, end]: Range) => Number((start + (end - start) * progress).toFixed(3));

  return {
    type: config.type,
    originalColors: config.originalColors,
    inverted: config.inverted,
    colorBack: palette[config.back],
    colorFront: palette[config.front],
    colorHighlight: palette[config.highlight],
    size: interpolate(config.size),
    colorSteps: Math.round(interpolate(config.colorSteps)),
    opacity: interpolate(config.opacity),
  };
}

export function LiveDitherImage({ image, settings }: {
  image: HTMLImageElement;
  settings: ReturnType<typeof liveDitherSettings>;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [contextLost, setContextLost] = useState(false);
  const { opacity, ...shaderProps } = settings;
  const blendStyle: CSSProperties & { "--dither-blend": number } = { "--dither-blend": opacity };

  useEffect(() => {
    const element = container.current;
    const lost = () => setContextLost(true);

    element?.addEventListener("webglcontextlost", lost, true);

    return () => element?.removeEventListener("webglcontextlost", lost, true);
  }, []);

  return (
    <div ref={container} className="pointer-events-none absolute inset-0" data-live-dither>
      {!contextLost && (
        <ImageDithering
          {...shaderProps}
          image={image}
          fit="cover"
          speed={0}
          minPixelRatio={1}
          maxPixelCount={140_000}
          aria-hidden
          className="absolute inset-0 opacity-(--dither-blend)"
          style={blendStyle}
        />
      )}
      {contextLost && <p className="absolute inset-x-2 bottom-2 rounded-lg border bg-background p-2 text-xs text-foreground">The preview lost its GPU context. Showing the original photo; reselect Live shader to retry.</p>}
    </div>
  );
}

export function LiveDitherControls({ config, palette, onChange, onLoadSaved }: {
  config: LiveDitherConfig;
  palette: Palette;
  onChange: (config: LiveDitherConfig) => void;
  onLoadSaved: () => void;
}) {
  const id = useId();

  const ranges = [
    { key: "size", label: "Pixel size", min: 0.5, max: 8, step: 0.05, descending: false },
    { key: "colorSteps", label: "Color steps", min: 1, max: 7, step: 1, descending: true },
    { key: "opacity", label: "Filter blend", min: 0, max: 1, step: 0.01, descending: false },
  ] as const;

  function changeRange(key: "size" | "colorSteps" | "opacity", position: number, value: number, descending: boolean) {
    const range: Range = [...config[key]];

    range[position] = value;

    if (descending ? range[0] < range[1] : range[0] > range[1]) {
      range[position === 0 ? 1 : 0] = value;
    }

    onChange({ ...config, [key]: range });
  }

  return (
    <fieldset className="flex min-w-0 flex-col gap-5 rounded-2xl border p-5">
      <legend className="px-2 font-heading text-xl">Live dither controls</legend>
      <div className="flex flex-wrap gap-2">
        <Button tone="leaf" size="sm" onClick={onLoadSaved}>Saved login</Button>
        <Button tone="cloud" size="sm" onClick={() => onChange(DEFAULT_LIVE_DITHER)}>Ambar mix</Button>
        <Button tone="cloud" size="sm" onClick={() => onChange({ ...DEFAULT_LIVE_DITHER, back: "cloud", front: "leaf", highlight: "ink" })}>Leaf paper</Button>
        <Button tone="cloud" size="sm" onClick={() => onChange({ ...DEFAULT_LIVE_DITHER, back: "ink", front: "sky", highlight: "cloud" })}>Sky paper</Button>
        <Button tone="cloud" size="sm" onClick={() => onChange({ ...DEFAULT_LIVE_DITHER, back: "ink", front: "cloud", highlight: "cloud" })}>Ink & cloud</Button>
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        {COLOR_NAMES.map((name) => (
          <span key={name} className="flex items-center gap-2">
            <span aria-hidden className={`size-4 rounded-full border ${SWATCHES[name]}`} />
            <span>{name} <span className="text-muted-foreground">{palette[name]}</span></span>
          </span>
        ))}
        <a href="/dev/colors" className="text-link underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-ring">Color reference</a>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label htmlFor={`${id}-pattern`} className="flex flex-col gap-2 text-sm font-medium">
          Pattern
          <select id={`${id}-pattern`} value={config.type} onChange={(event) => {
            const type = PATTERNS.find((pattern) => pattern === event.target.value);

            if (type) {
              onChange({ ...config, type });
            }
          }} className={FIELD}>
            <option value="2x2">2×2 ordered</option>
            <option value="4x4">4×4 ordered</option>
            <option value="8x8">8×8 ordered</option>
            <option value="random">Random grain</option>
          </select>
        </label>
        <div className="flex flex-col justify-center gap-3 text-sm">
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={config.originalColors} onChange={(event) => onChange({ ...config, originalColors: event.target.checked })} className={RANGE_FOCUS} />
            Keep original photo colors
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={config.inverted} onChange={(event) => onChange({ ...config, inverted: event.target.checked })} className={RANGE_FOCUS} />
            Invert luminance
          </label>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {([{ key: "back", label: "Background tone" }, { key: "front", label: "Foreground tone" }, { key: "highlight", label: "Highlight tone" }] as const).map(({ key, label }) => (
          <label key={key} htmlFor={`${id}-${key}`} className="flex flex-col gap-2 text-sm font-medium">
            {label}
            <select id={`${id}-${key}`} value={config[key]} disabled={config.originalColors} onChange={(event) => {
              const color = COLOR_NAMES.find((name) => name === event.target.value);

              if (color) {
                onChange({ ...config, [key]: color });
              }
            }} className={`${FIELD} disabled:opacity-50`}>
              {COLOR_NAMES.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </label>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">Start applies to frame 01 and End to frame 12. Intermediate frames interpolate between them. Blend keeps the original photo visible beneath the filter; 100% uses only the shader.</p>
      <div className="grid gap-5 sm:grid-cols-3">
        {ranges.map(({ key, label, min, max, step, descending }) => (
          <fieldset key={key} className="flex min-w-0 flex-col gap-3">
            <legend className="mb-3 text-sm font-medium">{label}</legend>
            {(["Start", "End"] as const).map((position, index) => (
              <div key={position} className="flex flex-col gap-2">
                <label htmlFor={`${id}-${key}-${index}`} className="flex items-center justify-between gap-2 text-sm">
                  <span className="sr-only">{label} </span>
                  <span>{position}</span>
                  <span className="text-muted-foreground tabular-nums">{key === "opacity" ? `${Math.round(config[key][index] * 100)}%` : config[key][index]}</span>
                </label>
                <input id={`${id}-${key}-${index}`} type="range" min={min} max={max} step={step} value={config[key][index]} onChange={(event) => changeRange(key, index, Number(event.target.value), descending)} className={`w-full ${RANGE_FOCUS}`} />
              </div>
            ))}
          </fieldset>
        ))}
      </div>
    </fieldset>
  );
}
