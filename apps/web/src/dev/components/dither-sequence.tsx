import { ArrowLeftIcon, ArrowRightIcon, PauseIcon, PlayIcon } from "@phosphor-icons/react";
import { Button } from "@ambar/ui/components/button";
import { SegmentedControl } from "@ambar/ui/components/segmented-control";
import { SIGN_IN_DITHER } from "@ambar/ui/lib/sign-in-dither";
import { useEffect, useEffectEvent, useId, useState } from "react";

import { ditherFrames, ditherProfiles, ditherSettings, type DitherProfileId } from "../data/dither-sequence.ts";
import { DEFAULT_LIVE_DITHER, LiveDitherControls, LiveDitherImage, liveDitherSettings, readDitherEnvironment, type LiveDitherConfig } from "../lab/live-dither.tsx";

const RANGE_FOCUS = "accent-leaf focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-4 focus-visible:outline-ring";

export function DitherSequence() {
  const id = useId();
  const [profile, setProfile] = useState<DitherProfileId>("fine");
  const [frame, setFrame] = useState(0);
  const [fps, setFps] = useState(8);
  const [loop, setLoop] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [loadedProfile, setLoadedProfile] = useState<DitherProfileId | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [liveConfig, setLiveConfig] = useState(DEFAULT_LIVE_DITHER);
  const [decodedImages, setDecodedImages] = useState<HTMLImageElement[]>([]);
  const [environment, setEnvironment] = useState<ReturnType<typeof readDitherEnvironment> | null>(null);

  const ready = loadedProfile === profile;
  const live = profile === "live";
  const treatment = ditherProfiles.find((candidate) => candidate.id === profile)!;
  const sources = ditherFrames.map((photo) => photo.sources.find((source) => source.profile === profile)!.src);
  const current = ditherFrames[frame];
  const liveSettings = live && environment ? liveDitherSettings(liveConfig, environment.palette, frame) : null;
  const settings = live ? liveSettings : ditherSettings.find((candidate) => candidate.id === profile)?.frames[frame];

  const recipe = live && environment ? {
    shader: "Paper ImageDithering @paper-design/shaders-react@0.0.81",
    width: 600, height: 800, fit: "cover", fps, loop,
    config: liveConfig,
    palette: environment.palette,
    frames: ditherFrames.map((photo, index) => ({
      frame: index + 1,
      originalFrame: photo.originalFrame,
      source: photo.sourceUrl,
      ...liveDitherSettings(liveConfig, environment.palette, index),
    })),
  } : null;

  useEffect(() => {
    let active = true;

    const images = ditherFrames.map((photo) => {
      const image = new Image();

      image.src = photo.sources.find((source) => source.profile === profile)!.src;

      return image;
    });

    Promise.all(images.map((image) => image.decode())).then(() => {
      if (active) {
        setDecodedImages(images);
        setLoadedProfile(profile);
      }
    }).catch(() => {
      if (active) {
        setLoadError(true);
      }
    });

    return () => { active = false; };
  }, [profile]);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");

    const update = () => {
      setReduceMotion(preference.matches);

      if (preference.matches) {
        setPlaying(false);
      }
    };

    update();
    preference.addEventListener("change", update);

    return () => preference.removeEventListener("change", update);
  }, []);

  const advance = useEffectEvent(() => {
    if (frame === ditherFrames.length - 1) {
      if (loop) {
        setFrame(0);
      } else {
        setPlaying(false);
      }
    } else {
      setFrame(frame + 1);
    }
  });

  useEffect(() => {
    if (!playing) {
      return;
    }

    let animation = 0;
    let previous = performance.now();

    const interval = 1000 / fps;

    const tick = (now: number) => {
      if (now - previous >= interval) {
        advance();
        previous = now - ((now - previous) % interval);
      }

      animation = requestAnimationFrame(tick);
    };

    const pauseWhenHidden = () => {
      if (document.hidden) {
        setPlaying(false);
      }
    };

    animation = requestAnimationFrame(tick);
    document.addEventListener("visibilitychange", pauseWhenHidden);

    return () => {
      cancelAnimationFrame(animation);
      document.removeEventListener("visibilitychange", pauseWhenHidden);
    };
  }, [playing, fps]);

  function chooseProfile(label: string) {
    const next = ditherProfiles.find((candidate) => candidate.label === label);

    if (next) {
      if (next.id === "live") {
        setEnvironment(readDitherEnvironment());
      }

      setPlaying(false);
      setLoadError(false);
      setProfile(next.id);
    }
  }

  function seek(next: number) {
    setPlaying(false);
    setFrame(next);
  }

  function changeLiveConfig(config: LiveDitherConfig) {
    setPlaying(false);
    setLiveConfig(config);
  }

  function loadSavedLogin() {
    const saved = SIGN_IN_DITHER.config;

    setPlaying(false);
    setFrame(0);
    setFps(SIGN_IN_DITHER.fps);
    setLoop(SIGN_IN_DITHER.loop);
    setLiveConfig({ ...saved, size: [...saved.size], colorSteps: [...saved.colorSteps], opacity: [...saved.opacity] });
  }

  function togglePlayback() {
    if (!playing && frame === ditherFrames.length - 1) {
      setFrame(0);
    }

    setPlaying(!playing);
  }

  return (
    <section className="flex min-w-0 flex-col gap-6" aria-label="Dithering sequence experiment">
      <div className="flex flex-col items-start gap-3">
        <div className="max-w-full overflow-x-auto p-1 [&_[data-slot=segmented-control]]:min-w-max">
          <SegmentedControl
            label="Image treatment"
            options={ditherProfiles.map((candidate) => candidate.label)}
            defaultValue="Fine grain"
            onValueChange={chooseProfile}
          />
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">{treatment.description}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {(["cloud", "ink"] as const).map((surface) => (
          <figure key={surface} className={`flex flex-col gap-3 rounded-2xl border bg-background p-4 text-foreground ${surface === "ink" ? "dark" : ""}`}>
            <figcaption className="text-xs font-medium tracking-widest uppercase">{surface}</figcaption>
            <div className="relative mx-auto aspect-3/4 w-full max-w-80 overflow-hidden rounded-lg">
              <img
                data-sequence-image={surface}
                src={sources[frame]}
                alt={`${current.name}, frame ${frame + 1}, ${treatment.label.toLowerCase()}`}
                width={600}
                height={800}
                decoding="sync"
                className="size-full object-cover"
              />
              {live && ready && environment?.supported && liveSettings && (
                <LiveDitherImage image={decodedImages[frame]} settings={liveSettings} />
              )}
            </div>
          </figure>
        ))}
      </div>

      {live && environment && (
        <>
          {!environment.supported && <output className="text-sm text-muted-foreground">WebGL2 is unavailable. Showing original photos; the prepared treatments still work. You can adjust and download settings for another device.</output>}
          <LiveDitherControls config={liveConfig} palette={environment.palette} onChange={changeLiveConfig} onLoadSaved={loadSavedLogin} />
        </>
      )}

      <div className="flex flex-col gap-5 rounded-2xl border p-5">
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={togglePlayback} disabled={!ready || reduceMotion} tone="ink" size="sm">
            {playing ? <PauseIcon aria-hidden weight="fill" /> : <PlayIcon aria-hidden weight="fill" />}
            {playing ? "Pause" : frame === ditherFrames.length - 1 ? "Replay" : "Play"}
          </Button>
          <Button tone="cloud" size="icon-sm" aria-label="Previous frame" disabled={frame === 0} onClick={() => seek(frame - 1)}>
            <ArrowLeftIcon aria-hidden />
          </Button>
          <Button tone="cloud" size="icon-sm" aria-label="Next frame" disabled={frame === ditherFrames.length - 1} onClick={() => seek(frame + 1)}>
            <ArrowRightIcon aria-hidden />
          </Button>
          <Button tone="cloud" size="sm" onClick={() => seek(0)}>Reset</Button>
          <label className="ml-auto flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={loop} onChange={(event) => setLoop(event.target.checked)} className={RANGE_FOCUS} />
            Loop
          </label>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor={`${id}-frame`} className="flex items-center justify-between gap-3 text-sm font-medium">
            <span>Frame</span>
            <span data-frame-counter className="tabular-nums">{String(frame + 1).padStart(2, "0")} / 12</span>
          </label>
          <input id={`${id}-frame`} type="range" min={0} max={11} step={1} value={frame} onChange={(event) => seek(Number(event.target.value))} aria-valuetext={`Frame ${frame + 1} of 12`} className={`w-full ${RANGE_FOCUS}`} />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor={`${id}-speed`} className="flex items-center justify-between gap-3 text-sm font-medium">
            <span>Playback speed</span>
            <span className="tabular-nums">{fps} fps · {(12 / fps).toFixed(2)} s</span>
          </label>
          <input id={`${id}-speed`} type="range" min={4} max={24} step={1} value={fps} onChange={(event) => setFps(Number(event.target.value))} aria-valuetext={`${fps} frames per second`} className={`w-full ${RANGE_FOCUS}`} />
        </div>

        <output className="block text-sm text-muted-foreground">
          {loadError ? "Some frames could not load. Choose another treatment or reload to retry." : !ready ? "Preparing all twelve frames…" : reduceMotion ? "Reduced motion is on. Use the frame slider or arrows to inspect the sequence." : "Ready. Playback starts only when you press Play."}
        </output>
        {settings && (
          <p className="text-sm text-muted-foreground tabular-nums">
            Pattern {settings.type} · pixel size {settings.size.toFixed(2)} · color steps {settings.colorSteps} · filter blend {Math.round(settings.opacity * 100)}%
          </p>
        )}
        <a
          href={live ? recipe ? `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(recipe, null, 2))}` : undefined : sources[frame]}
          download={live ? "ambar-live-dither.json" : `${profile}-frame-${String(frame + 1).padStart(2, "0")}.webp`}
          className="self-start text-sm font-medium text-link underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-4 focus-visible:outline-ring"
        >
          {live ? "Download settings for all 12 frames" : "Download this frame"}
        </a>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-xl">Contact sheet</h2>
        <p className="text-sm text-muted-foreground">Frames follow the verified sequence from Paper and are numbered by playback position. Select a frame to pause and inspect it.{live && " Thumbnails show the originals; the two previews above show your live settings."}</p>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 xl:grid-cols-6">
          {sources.map((src, index) => (
            <button
              key={src}
              type="button"
              aria-label={`Inspect frame ${index + 1}`}
              aria-pressed={frame === index}
              onClick={() => seek(index)}
              className="flex cursor-pointer flex-col gap-2 rounded-lg border border-transparent p-1.5 text-muted-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-ring aria-pressed:border-link aria-pressed:text-link"
            >
              <img src={src} alt="" width={600} height={800} className="aspect-3/4 w-full rounded object-cover" />
              <span className="text-xs font-medium tabular-nums">{String(index + 1).padStart(2, "0")}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
