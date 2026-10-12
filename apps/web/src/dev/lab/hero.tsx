import {
  ArrowClockwiseIcon,
  ArrowRightIcon,
  CheckIcon,
  ImageIcon,
  LinkIcon,
  PlayIcon,
} from "@phosphor-icons/react";
import { Button } from "@ambar/ui/components/button";
import { FirstMomentDialog } from "@ambar/ui/components/first-moment-dialog";
import { SegmentedControl } from "@ambar/ui/components/segmented-control";
import { cn } from "@ambar/ui/lib/utils";
import { useEffect, useId, useState, type ReactNode } from "react";

import photo from "../assets/dither-sequence/original/frame-01.webp?url";
import linkPhoto from "../assets/dither-sequence/original/frame-08.webp?url";
import clipPoster from "../../../../../packages/ui/src/assets/sign-in-sequence/frame-01.webp?url";
import { BrowserMockup } from "./browser-mockup.tsx";
import { PhoneMockup } from "./phone-mockup.tsx";
import type { HeroDither, HeroTreatment } from "./hero-dither.tsx";
import {
  decodeHeroImage,
  STORY_DURATION,
  supportsHeroShader,
  useHeroEnvironment,
  useHeroPlayback,
} from "./hero-playback.ts";

const clipAssets = import.meta.glob<string>(
  "../../../../../packages/ui/src/assets/sign-in-sequence/*.webp",
  {
    eager: true,
    query: "?url",
    import: "default",
  },
);

const CLIP_FRAMES = Array.from({ length: 12 }, (_, index) => {
  const filename = `frame-${String(index + 1).padStart(2, "0")}.webp`;

  const src =
    clipAssets[
      `../../../../../packages/ui/src/assets/sign-in-sequence/${filename}`
    ];

  if (!src) {
    throw new Error(`Missing hero clip frame: ${filename}`);
  }

  return src;
});

const CONTENT = [
  {
    kind: "Photo",
    title: "A little pause outside.",
    detail: "Today, on your walk",
    src: photo,
    icon: ImageIcon,
  },
  {
    kind: "Clip",
    title: "A few seconds worth keeping.",
    detail: "The light through the leaves",
    src: clipPoster,
    icon: PlayIcon,
  },
  {
    kind: "Link",
    title: "The art of paying attention",
    detail: "fieldnotes.example · 4 min read",
    src: linkPhoto,
    icon: LinkIcon,
  },
] as const;

type HeroContent = (typeof CONTENT)[number];

type HeroProps = {
  continueHref: string;
  backdropSrc: string;
  apiUrl?: string;
};

type PreparedMedia = {
  kind: HeroContent["kind"];
  motion: boolean;
  images: HTMLImageElement[];
  failed: boolean;
};

let shaderModule: Promise<typeof import("./hero-dither.tsx")> | undefined;

function loadShader() {
  shaderModule ??= import("./hero-dither.tsx");

  return shaderModule;
}

function ContentImage({ src }: { src: string }) {
  return (
    <img
      src={src}
      alt=""
      width={600}
      height={800}
      draggable={false}
      decoding="async"
      onError={(event) => {
        event.currentTarget.hidden = true;
      }}
      className="absolute inset-0 size-full object-cover"
    />
  );
}

type MomentScreenProps = {
  content: HeroContent;
  src: string;
  phone?: boolean;
  kept: boolean;
  shader?: ReactNode;
};

/** The same moment in both frames; only the screen layout changes between devices. */
function MomentScreen({
  content,
  src,
  phone = false,
  kept,
  shader,
}: MomentScreenProps) {
  const Icon = content.icon;

  return (
    <div
      className={cn(
        "@container relative size-full overflow-hidden bg-cloud text-ink",
        phone ? "flex flex-col pt-[10%]" : "grid grid-cols-[57%_43%]",
      )}
      data-moment-screen={phone ? "phone" : "browser"}
    >
      <div
        className={cn(
          "relative min-h-0 overflow-hidden bg-sky/30",
          phone && "h-[52%] shrink-0",
        )}
      >
        <ContentImage src={src} />
        {shader}
        {content.kind === "Clip" && (
          <span className="absolute right-[5%] bottom-[5%] flex items-center gap-[1cqw] rounded-full bg-cloud px-[3%] py-[1.5%] text-[clamp(0.375rem,2.4cqw,0.75rem)] font-medium text-ink">
            <PlayIcon
              aria-hidden
              weight="fill"
              className="size-[clamp(0.375rem,3cqw,1rem)]"
            />
            0:03
          </span>
        )}
      </div>
      <div
        className={cn(
          "flex min-h-0 min-w-0 flex-col justify-center",
          phone
            ? "flex-1 gap-[1.5cqw] px-[7%] pt-[4%] pb-[9%]"
            : "gap-[2cqw] px-[9%] py-[7%]",
        )}
      >
        <div
          className={cn(
            "flex items-center gap-[1cqw] font-medium text-ink/65",
            phone
              ? "text-[clamp(0.375rem,4cqw,0.5625rem)]"
              : "text-[clamp(0.5rem,2.4cqw,0.75rem)]",
          )}
        >
          <Icon
            aria-hidden
            className="size-[clamp(0.375rem,3cqw,1rem)] shrink-0"
          />
          {content.kind}
        </div>
        {content.kind === "Link" && !phone && (
          <p className="text-[clamp(0.4375rem,2cqw,0.625rem)] font-medium tracking-[0.14em] text-leaf uppercase">
            Field notes
          </p>
        )}
        <p
          className={cn(
            "font-heading",
            phone
              ? "text-[clamp(0.4375rem,6cqw,0.875rem)]/[1.2]"
              : "text-[clamp(0.75rem,5cqw,1.75rem)]/[1.2]",
          )}
        >
          {content.title}
        </p>
        <p
          className={cn(
            "truncate text-ink/65",
            phone
              ? "text-[clamp(0.375rem,3.5cqw,0.5rem)]"
              : "text-[clamp(0.4375rem,2.1cqw,0.6875rem)]",
          )}
        >
          {content.detail}
        </p>
        {content.kind === "Link" && !phone && (
          <p className="hidden text-[clamp(0.5rem,2.5cqw,0.8125rem)] leading-relaxed text-ink/65 sm:block">
            Small things. A closer look. A quiet reminder to notice what is
            right in front of you.
          </p>
        )}
        <span
          className={cn(
            "flex w-fit items-center gap-[1cqw] rounded-full bg-leaf text-cloud transition-[translate,opacity] duration-300 ease-out-soft motion-reduce:transition-none",
            phone
              ? "px-[8%] py-[3%] text-[clamp(0.375rem,3.5cqw,0.5rem)]"
              : "px-[8%] py-[4%] text-[clamp(0.5rem,2.4cqw,0.75rem)]",
            kept ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0",
          )}
        >
          <CheckIcon
            aria-hidden
            weight="bold"
            className="size-[clamp(0.375rem,2.8cqw,0.875rem)] shrink-0"
          />
          {phone ? "Already here." : "Kept."}
        </span>
      </div>
    </div>
  );
}

function Fragment({
  content,
  index,
  gathered,
}: {
  content: HeroContent;
  index: number;
  gathered: boolean;
}) {
  const Icon = content.icon;

  return (
    <div
      aria-hidden
      className={cn(
        "absolute z-10 w-[27%] rounded-2xl border border-ink/5 bg-cloud p-2 text-ink shadow-[0_12px_40px_-20px_var(--color-ink)] transition-[translate,opacity] duration-1000 ease-settle motion-reduce:transition-none sm:w-[23%] sm:p-3",
        index === 0
          ? "top-[57%] left-[7%] -rotate-8 sm:top-[14%] sm:left-[6%]"
          : "top-[57%] left-[34%] rotate-6 sm:top-[58%] sm:left-[7%]",
        gathered
          ? "-translate-x-2 opacity-75 sm:-translate-x-5"
          : "translate-x-0 opacity-100",
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-sky/30 sm:aspect-[16/10]">
        <ContentImage src={content.src} />
        {content.kind === "Clip" && (
          <span className="absolute right-2 bottom-2 flex size-6 items-center justify-center rounded-full bg-cloud text-ink">
            <PlayIcon aria-hidden weight="fill" className="size-3" />
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5 px-1 pt-2 text-[10px] font-medium sm:text-xs">
        <Icon aria-hidden className="size-3 shrink-0" />
        <span className="truncate">
          {content.kind === "Link"
            ? content.title
            : content.kind === "Clip"
              ? "That bit of light"
              : "Something you noticed"}
        </span>
      </div>
      {content.kind === "Link" && (
        <p className="truncate px-1 pt-1 text-[9px] text-ink/65 sm:text-[10px]">
          fieldnotes.example
        </p>
      )}
    </div>
  );
}

function HeroScene({ treatment }: { treatment: HeroTreatment }) {
  const id = useId();
  const [selected, setSelected] = useState<HeroContent["kind"]>("Photo");
  const [request, setRequest] = useState(0);
  const [media, setMedia] = useState<PreparedMedia | null>(null);

  const [Shader, setShader] = useState<typeof HeroDither | null>(null);

  const [shaderReady, setShaderReady] = useState(false);
  const [shaderFailed, setShaderFailed] = useState(false);
  const { container, motion, active } = useHeroEnvironment();
  const content = CONTENT.find((item) => item.kind === selected) ?? CONTENT[0];
  const others = CONTENT.filter((item) => item.kind !== selected);

  const ready =
    media?.kind === selected &&
    media.motion === motion &&
    !media.failed &&
    (shaderReady || !motion);

  const time = useHeroPlayback(
    `${selected}:${treatment}:${request}`,
    ready,
    active,
  );

  const effectiveTime =
    motion && !(media?.kind === selected && media.failed)
      ? time
      : STORY_DURATION;

  const phase =
    effectiveTime < 1000
      ? "find"
      : effectiveTime < 2500
        ? "keep"
        : effectiveTime < STORY_DURATION
          ? "carry"
          : "rest";

  const gathered = phase !== "find";
  const carried = phase === "carry" || phase === "rest";
  const progress = Math.min(1, Math.max(0, (effectiveTime - 1000) / 1500));

  const clipFrame =
    selected === "Clip" && effectiveTime < STORY_DURATION && motion
      ? Math.min(11, Math.floor(effectiveTime / 250))
      : 0;

  const currentImage =
    media?.kind === selected
      ? (media.images[clipFrame] ?? media.images[0])
      : undefined;

  const currentSrc = currentImage?.src ?? content.src;

  useEffect(() => {
    if (!("Image" in window)) {
      return;
    }

    let current = true;
    const sources = selected === "Clip" && motion ? CLIP_FRAMES : [content.src];

    Promise.all(sources.map(decodeHeroImage))
      .then((images) => {
        if (current) {
          setMedia({ kind: selected, motion, images, failed: false });
        }
      })
      .catch(() => {
        if (current) {
          setMedia({ kind: selected, motion, images: [], failed: true });
        }
      });

    return () => {
      current = false;
    };
  }, [selected, content.src, motion]);

  useEffect(() => {
    if (!active || shaderReady || shaderFailed) {
      return;
    }

    let current = true;

    if (!supportsHeroShader()) {
      // oxlint-disable-next-line react/set-state-in-effect -- unavailable WebGL is a browser capability, not application state.
      setShaderFailed(true);
      setShaderReady(true);

      return;
    }

    loadShader()
      .then((module) => {
        if (current) {
          setShader(() => module.HeroDither);
          setShaderReady(true);
        }
      })
      .catch(() => {
        if (current) {
          setShaderFailed(true);
          setShaderReady(true);
        }
      });

    return () => {
      current = false;
    };
  }, [active, shaderReady, shaderFailed]);

  function replay(kind = selected) {
    setSelected(kind);
    setRequest((previous) => previous + 1);
  }

  return (
    <div
      ref={container}
      className="@container flex flex-col gap-6"
      data-hero-content={selected}
      data-hero-phase={phase}
      data-hero-time={Math.round(effectiveTime)}
    >
      <figure
        className="relative isolate m-0 h-[max(27rem,115cqw)] overflow-hidden rounded-[2rem] sm:h-[34rem]"
        aria-label="A moment kept on one device, waiting on another"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_42%,var(--color-sky),transparent_65%)] opacity-25"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute top-[6%] left-[22%] aspect-square w-[70%] rounded-full border border-sky/20 sm:left-[23%] sm:w-[56%]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute top-[16%] left-[30%] aspect-square w-[54%] rounded-full border border-leaf/10 sm:left-[30%] sm:w-[42%]"
        />
        {others.map((item, index) => (
          <Fragment
            key={item.kind}
            content={item}
            index={index}
            gathered={gathered}
          />
        ))}

        <div
          className={cn(
            "absolute top-[6%] left-[5%] z-20 w-[90%] transition-transform duration-1000 ease-settle motion-reduce:transition-none sm:top-[17%] sm:left-[25%] sm:w-[52%]",
            gathered
              ? "translate-x-0 translate-y-0 rotate-0"
              : "translate-x-1 translate-y-3 rotate-2 sm:translate-x-4 sm:translate-y-5",
          )}
        >
          <BrowserMockup
            url={
              selected === "Link"
                ? "fieldnotes.example"
                : "ambar.example/moments"
            }
          >
            <MomentScreen
              content={content}
              src={currentSrc}
              kept={gathered}
              shader={
                Shader && currentImage && motion && !shaderFailed ? (
                  <Shader
                    image={currentImage}
                    treatment={treatment}
                    progress={progress}
                    onContextLost={() => setShaderFailed(true)}
                  />
                ) : undefined
              }
            />
          </BrowserMockup>
        </div>

        <div
          aria-hidden
          className={cn(
            "absolute bottom-[14%] left-[64%] z-30 w-[26%] max-w-20 transition-[translate,opacity] duration-1000 ease-settle motion-reduce:transition-none sm:top-[15%] sm:bottom-auto sm:left-[76%] sm:w-[20%] sm:max-w-none",
            carried
              ? "translate-x-0 translate-y-0 opacity-100"
              : "-translate-x-5 translate-y-3 opacity-0 sm:-translate-x-12",
          )}
        >
          <PhoneMockup>
            <MomentScreen
              content={content}
              src={currentSrc}
              phone
              kept={carried}
            />
          </PhoneMockup>
          <p className="hidden pt-3 text-center text-xs font-medium text-muted-foreground sm:block">
            On your other device.
          </p>
        </div>

        <div
          aria-hidden
          className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-2 text-[10px] font-medium sm:bottom-4 sm:gap-3 sm:text-xs"
        >
          <span
            className={cn(
              "rounded-full px-3 py-1.5",
              phase === "find" ? "bg-ink text-cloud" : "text-muted-foreground",
            )}
          >
            Find it.
          </span>
          <ArrowRightIcon className="size-3 text-muted-foreground" />
          <span
            className={cn(
              "rounded-full px-3 py-1.5",
              phase === "keep" ? "bg-leaf text-cloud" : "text-muted-foreground",
            )}
          >
            Keep it.
          </span>
          <ArrowRightIcon className="size-3 text-muted-foreground" />
          <span
            className={cn(
              "rounded-full px-3 py-1.5",
              carried ? "bg-sky text-ink" : "text-muted-foreground",
            )}
          >
            There, too.
          </span>
        </div>
      </figure>

      <div className="flex flex-col items-center gap-3">
        <p id={`${id}-choose`} className="text-sm text-muted-foreground">
          A photo. A clip. A link. What would you keep?
        </p>
        <fieldset
          aria-labelledby={`${id}-choose`}
          className="flex flex-wrap justify-center gap-2"
        >
          {CONTENT.map((item) => {
            const ContentIcon = item.icon;

            return (
              <Button
                key={item.kind}
                tone={selected === item.kind ? "leaf" : "cloud"}
                size="sm"
                aria-pressed={selected === item.kind}
                onClick={() => replay(item.kind)}
              >
                <ContentIcon aria-hidden />
                {item.kind}
              </Button>
            );
          })}
          <Button
            tone="cloud"
            size="icon-sm"
            aria-label="Replay the story"
            onClick={() => replay()}
          >
            <ArrowClockwiseIcon aria-hidden />
          </Button>
        </fieldset>
        <output className="sr-only" aria-live="polite">
          {carried
            ? `${selected} kept. Waiting on your other device.`
            : `Keeping your ${selected.toLowerCase()}.`}
        </output>
        {(media?.failed || shaderFailed) && (
          <p className="text-center text-xs text-muted-foreground">
            {media?.failed
              ? "An image could not load. Showing the static concept."
              : "Showing the image treatment without WebGL."}
          </p>
        )}
      </div>
    </div>
  );
}

export function HeroLab({ continueHref, backdropSrc, apiUrl }: HeroProps) {
  const [treatment, setTreatment] = useState<HeroTreatment>("Photographic");
  const [surface, setSurface] = useState("Cloud");

  return (
    <div className="flex flex-col gap-6" data-hero-lab>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <SegmentedControl
          options={["Photographic", "Graphic"]}
          label="Image treatment"
          onValueChange={(value) =>
            setTreatment(value === "Graphic" ? "Graphic" : "Photographic")
          }
        />
        <SegmentedControl
          options={["Cloud", "Ink"]}
          label="Preview surface"
          onValueChange={setSurface}
        />
      </div>
      <section
        className={cn(
          "overflow-hidden rounded-[2rem] border bg-background px-3 pt-12 pb-8 text-foreground sm:px-6 sm:pt-16 sm:pb-10",
          surface === "Ink" && "dark",
        )}
        aria-label="Hero concept preview"
        data-hero-treatment={treatment}
      >
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-5 px-3 text-center">
          <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
            For the things you want to find again.
          </p>
          <h2 className="text-5xl leading-[0.95] tracking-tight text-balance sm:text-7xl">
            A moment kept.
            <span className="mt-2 block text-leaf">Still there.</span>
          </h2>
          <p className="max-w-md text-base text-pretty text-muted-foreground sm:text-lg">
            Keep photos, clips and links. Find them on any device. Share only
            what you choose.
          </p>
          <FirstMomentDialog
            continueHref={continueHref}
            backdropSrc={backdropSrc}
            apiUrl={apiUrl}
          />
          <noscript>
            <a
              href={`${continueHref}/login`}
              className="text-link underline underline-offset-4"
            >
              Open Ambar to start keeping
            </a>
          </noscript>
        </div>
        <HeroScene treatment={treatment} />
      </section>
      <p className="max-w-2xl text-sm text-muted-foreground">
        Concept preview. Both treatments tell the same four-second story. Choose
        a content type to replay it; switch surfaces to compare cloud and ink.
        Nothing in this scene is uploaded or saved.
      </p>
    </div>
  );
}
