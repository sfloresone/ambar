// The amber mark (stone + leaf) as inline SVG: nothing to load, so it can never show a broken image.
// Geometry and colorway come from lib/mark-paths.ts, shared with the Astro Mark and markSvg(). Only the
// color colorway, the one the product uses; the others live in Astro until a platform needs them.
import { useId } from "react";

import { highlight, leaf, leafTransform, markColors, markGradient, spark, stone, veinOpacity, veins } from "../lib/mark-paths.ts";

type MarkProps = {
  className?: string;
};

export function Mark({ className }: MarkProps) {
  const gradient = useId();

  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" aria-hidden className={className}>
      <defs>
        <radialGradient id={gradient} cx={markGradient.cx} cy={markGradient.cy} r={markGradient.r}>
          {markGradient.stops.map((stop) => (
            <stop key={stop.offset} offset={stop.offset} stopColor={stop.color} />
          ))}
        </radialGradient>
      </defs>
      <path d={stone} fill={`url(#${gradient})`} stroke={markColors.edge} strokeWidth="1" />
      <g transform={leafTransform}>
        <path d={leaf} fill={markColors.leaf} />
        <path d={veins} fill="none" stroke="#ffffff" strokeOpacity={veinOpacity} strokeWidth="1.4" strokeLinecap="round" />
      </g>
      <ellipse cx={highlight.cx} cy={highlight.cy} rx={highlight.rx} ry={highlight.ry} transform={highlight.transform} fill="#ffffff" fillOpacity={highlight.opacity} />
      <circle cx={spark.cx} cy={spark.cy} r={spark.r} fill="#ffffff" fillOpacity={spark.opacity} />
    </svg>
  );
}
