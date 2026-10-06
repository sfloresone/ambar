import sharp from "sharp";
import { leaf, leafTransform, stone, veins } from "@ambar/ui/lib/mark-paths";

/** Offline geometry only: R relief, G leaf, B veins, A stone coverage. */
const size = 256;

async function rasterize(content: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 200 200">${content}</svg>`;

  return sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer();
}

const [outline, foliage, branches] = await Promise.all([
  rasterize(`<path d="${stone}" fill="white"/>`),
  rasterize(`<g transform="${leafTransform}"><path d="${leaf}" fill="white"/></g>`),
  rasterize(`<g transform="${leafTransform}"><path d="${veins}" fill="none" stroke="white" stroke-width="1.4" stroke-linecap="round"/></g>`),
]);

// Two chamfer passes approximate distance to the contour without browser-time geometry.
const distance = Float32Array.from({ length: size * size }, (_, index) => outline[index * 4 + 3]! > 127 ? size : 0);

for (let y = 1; y < size - 1; y++) {
  for (let x = 1; x < size - 1; x++) {
    const index = y * size + x;

    distance[index] = Math.min(distance[index]!, distance[index - 1]! + 1, distance[index - size]! + 1,
      distance[index - size - 1]! + Math.SQRT2, distance[index - size + 1]! + Math.SQRT2);
  }
}

for (let y = size - 2; y > 0; y--) {
  for (let x = size - 2; x > 0; x--) {
    const index = y * size + x;

    distance[index] = Math.min(distance[index]!, distance[index + 1]! + 1, distance[index + size]! + 1,
      distance[index + size + 1]! + Math.SQRT2, distance[index + size - 1]! + Math.SQRT2);
  }
}

const maximum = Math.max(...distance);

const relief = Uint8Array.from(distance, (value) => {
  const inward = value / maximum;

  return Math.round(255 * Math.sqrt(inward * (2 - inward)));
});

const { data: smooth, info } = await sharp(relief, { raw: { width: size, height: size, channels: 1 } }).blur(6).raw().toBuffer({ resolveWithObject: true });

const packed = Buffer.alloc(size * size * 4);

for (let index = 0; index < distance.length; index++) {
  packed[index * 4] = smooth[index * info.channels]!;
  packed[index * 4 + 1] = foliage[index * 4 + 3]!;
  packed[index * 4 + 2] = branches[index * 4 + 3]!;
  packed[index * 4 + 3] = outline[index * 4 + 3]!;
}

await sharp(packed, { raw: { width: size, height: size, channels: 4 } })
  .png({ compressionLevel: 9, adaptiveFiltering: true })
  .toFile(new URL("../src/assets/pricing/surface-map.png", import.meta.url).pathname);
