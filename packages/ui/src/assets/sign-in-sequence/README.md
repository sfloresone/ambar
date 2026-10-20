# Sign-in photo sequence

The saved Live shader configuration from the owner's screenshot on 2026-10-07. Browser tab state was unavailable, so the screenshot is the source of truth. The settings live in `src/lib/sign-in-dither.ts`; `manifest.json` records source references, corrected order, per-frame settings and output hashes.

- Paper `ImageDithering` version 0.0.81, 8×8 ordered pattern.
- Original photo colors enabled; luminance inversion disabled.
- Background ink, foreground sky, highlight cloud. These tones are saved even though original-color mode bypasses them.
- Pixel size 0.65 → 1.8; color steps 7 → 2; original-photo/filter blend 12% → 90%.
- Twelve frames at 4 fps: a 3-second loop, in the confirmed order. No crossfade or extra frames.

Each WebP is 600 × 800, rendered in an isolated workspace using Paper's official shader, fixed pixel ratio 1, 480,000-pixel export canvas, quality 82. Blend is opacity over the original source photo. The originals remain in the development experiment; runtime components use only these prepared images.

`SignInShowcase` is the default left pane of the shared `FlowSplit`, used by the landing's Start keeping and Sign in dialogs, the app's `/login` and the development sign-in specimens. The frames are stacked `<img>` layers, each requested and decoded once; a CSS loop (`animate-sequence-frame` in `globals.css`, stepped opacity) plays them, so the loop costs no requests, React renders or JavaScript per frame. It waits for the entire sequence to decode, pauses offscreen (and the browser stops it in hidden tabs), and shows a static photo when reduced motion is preferred. Playback has no visible controls. The form stays first in DOM order so opening a dialog focuses the flow.

Below 768px the pane is hidden and its image source is a transparent inline fallback: none of these WebP frames download. With reduced motion enabled, desktop renders a static photo without downloading the remaining sequence. Failed loading leaves the first photo visible.

The public applications never import Paper's shader. The development lab retains it for experimentation; **Saved login** restores this configuration, playback speed and loop setting.
