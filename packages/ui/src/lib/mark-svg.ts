// The color mark as an SVG string, from the same geometry and colorway as the React and Astro Mark.
// For places that need markup before any JS runs, e.g. the app's pre-JS iris cover in index.html.
import { highlight, leaf, leafTransform, markColors, markGradient, spark, stone, veinOpacity, veins } from "./mark-paths.ts";

export function markSvg(): string {
  const stops = markGradient.stops.map((stop) => `<stop offset="${stop.offset}" stop-color="${stop.color}"/>`).join("");

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" aria-hidden="true">`,
    `<defs><radialGradient id="mark-cover-gradient" cx="${markGradient.cx}" cy="${markGradient.cy}" r="${markGradient.r}">${stops}</radialGradient></defs>`,
    `<path d="${stone}" fill="url(#mark-cover-gradient)" stroke="${markColors.edge}" stroke-width="1"/>`,
    `<g transform="${leafTransform}"><path d="${leaf}" fill="${markColors.leaf}"/>`,
    `<path d="${veins}" fill="none" stroke="#ffffff" stroke-opacity="${veinOpacity}" stroke-width="1.4" stroke-linecap="round"/></g>`,
    `<ellipse cx="${highlight.cx}" cy="${highlight.cy}" rx="${highlight.rx}" ry="${highlight.ry}" transform="${highlight.transform}" fill="#ffffff" fill-opacity="${highlight.opacity}"/>`,
    `<circle cx="${spark.cx}" cy="${spark.cy}" r="${spark.r}" fill="#ffffff" fill-opacity="${spark.opacity}"/>`,
    `</svg>`,
  ].join("");
}
