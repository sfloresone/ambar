// Lab candidate using Paper ImageDithering (Apache-2.0): https://shaders.paper.design/image-dithering.
import { ImageDithering } from "@paper-design/shaders-react";
import { useEffect, useEffectEvent, useRef, type CSSProperties } from "react";

export type HeroTreatment = "Photographic" | "Graphic";

type HeroDitherProps = {
  image: HTMLImageElement;
  treatment: HeroTreatment;
  progress: number;
  onContextLost: () => void;
};

export function HeroDither({
  image,
  treatment,
  progress,
  onContextLost,
}: HeroDitherProps) {
  const container = useRef<HTMLDivElement>(null);
  const graphic = treatment === "Graphic";
  const blend = graphic ? 0.9 : 0.9 - progress * 0.78;
  const contextLost = useEffectEvent(onContextLost);

  const style: CSSProperties & { "--hero-blend": number } = {
    "--hero-blend": blend,
  };

  useEffect(() => {
    const element = container.current;
    const lost = () => contextLost();

    element?.addEventListener("webglcontextlost", lost, true);

    return () =>
      element?.removeEventListener("webglcontextlost", lost, true);
  }, []);

  return (
    <div
      ref={container}
      aria-hidden
      className="pointer-events-none absolute inset-0 opacity-(--hero-blend)"
      style={style}
      data-hero-shader
    >
      <ImageDithering
        image={image}
        type="8x8"
        originalColors={!graphic}
        colorBack="#ffffff"
        colorFront="#537234"
        colorHighlight="#93bbcb"
        size={graphic ? 4 - progress * 2.75 : 1.8 - progress * 1.15}
        colorSteps={Math.round(2 + progress * (graphic ? 3 : 5))}
        fit="cover"
        speed={0}
        minPixelRatio={1}
        maxPixelCount={180_000}
        className="absolute inset-0 size-full"
      />
    </div>
  );
}
