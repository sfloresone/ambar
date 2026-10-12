import { markSvg } from "@ambar/ui/lib/mark-svg";

// The favicon is the mark itself, from the same geometry as every other renderer (prerendered to a file).
export function GET() {
  return new Response(markSvg(), { headers: { "Content-Type": "image/svg+xml" } });
}
