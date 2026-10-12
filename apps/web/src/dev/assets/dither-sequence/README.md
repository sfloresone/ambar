# Dither sequence experiment

Twelve photos from the Paper file "Jazzy tree", in the sequence refined through visual review and the user's corrections.

The corrected order, using the original experiment's numbering, is **01 → 02 → 04 → 03 → 06 → 05 → 08 → 07 → 10 → 09 → 12 → 11**. Files and player labels are numbered 01–12 by their corrected playback position.

The photos were read through the Paper MCP. Prepared frames were rendered with the exact `ImageDithering` component exported by Paper, from `@paper-design/shaders-react@0.0.81`, in an isolated export workspace. The same pinned package is a development dependency of `apps/web` for the live lab candidate in `src/dev/lab/live-dither.tsx`.

Each directory contains twelve 600 × 800 WebP frames:

- `original`: resized source photos, without dithering.
- `fine`: 8×8 ordered dithering, original colors, a finer grid.
- `graphic`: 4×4 ordered dithering, original colors, a larger grid.
- `print`: 8×8 ordered dithering, ink/cloud/sky palette blended with the source.

`manifest.json` records the source URLs, canvas node references, corrected order and exact per-frame settings. Each source's `originalFrame` preserves its number in the first experiment, while `frame` is its corrected playback position. Pixel size and filter opacity increase linearly across the twelve frames, while color steps decrease. A stable ordered pattern is used instead of random noise. Original-photo blending preserves visual detail.

All three filtered sequences were regenerated for the corrected positions. Moving an already-filtered image to another position would make the intensity decrease at the swapped pairs. The original WebP photos were reordered without re-encoding.

The filter is rendered at a fixed pixel ratio of 1 and the original 3:4 aspect ratio. Playback waits for the selected treatment's images to decode, starts on request, pauses when the page is hidden and supports manual inspection with reduced motion enabled.

Open `/dev/dither-sequence` with `bun run dev:web`. The gallery and its assets are not included in production routes or bundles.

## Live shader

Choose **Live shader** to edit the same filter in the browser. It uses the twelve original WebP photos in the corrected order. Prepared treatments remain available for comparison.

- Colors are read from the `ink`, `cloud`, `sky` and `leaf` theme tokens used at `/dev/colors`. No extra palette is introduced.
- Ambar mix, Leaf paper, Sky paper and Ink & cloud are starting points. Background, foreground and highlight tones can each use any of the four tokens. Original-color mode bypasses these palette controls.
- Pattern, luminance inversion and start/end values for pixel size, color steps and blend are editable. Intermediate frames interpolate using the same linear progression as the prepared sequences. Range controls preserve increasing size/blend and decreasing color steps.
- The existing player handles speed, looping, frame inspection, hidden-page pausing and reduced motion. Changing a live control pauses playback for inspection.
- Only the cloud and ink previews mount shaders, using decoded source images. Each canvas is capped at 140,000 pixels and has shader speed set to zero: a paused preview does not run a continuous shader animation. Thumbnails show originals.
- If WebGL2 is blocked, or a canvas loses its context, the original photo stays visible. Prepared treatments remain usable.
- **Download settings for all 12 frames** exports JSON with source references, playback order, brand color values and exact per-frame parameters. It exports settings, not newly rendered images. Blend is compositing opacity over the original photo, not an ImageDithering prop.
- **Saved login** restores the owner's captured configuration, 4 fps and looping. Its settings live in `@ambar/ui/lib/sign-in-dither`; exported WebP frames in `packages/ui/src/assets/sign-in-sequence` power the shared sign-in showcase without a runtime shader.

The live shader dependency is reached only from the development gallery and is excluded from the public site's build.

Reference: [Paper Image Dithering](https://shaders.paper.design/image-dithering).
