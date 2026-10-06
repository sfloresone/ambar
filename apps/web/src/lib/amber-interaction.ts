import type { AmberRenderer } from "@ambar/ui/lib/amber-renderer";

type Connection = EventTarget & { saveData?: boolean };

/** Enhances the server-rendered poster only when motion and GPU access are available. */
export function attachAmberInteraction(root: HTMLElement) {
  const preference = window.matchMedia?.("(prefers-reduced-motion: reduce)") ?? null;
  // SAFETY: connection is an optional browser extension; only saveData and EventTarget methods are read.
  const connection = (navigator as Navigator & { connection?: Connection }).connection;

  const cleanups = Array.from(root.querySelectorAll<HTMLElement>("[data-amber-specimen]"), (specimen) => {
    const control = specimen.querySelector<HTMLButtonElement>("[data-amber-control]");
    const drop = specimen.querySelector<HTMLElement>("[data-amber-drop]");
    const poster = specimen.querySelector<HTMLElement>("[data-amber-poster]");

    if (!control || !drop) return () => {};

    const events = new AbortController();
    const options = { signal: events.signal };
    let renderer: AmberRenderer | null = null;
    let canvas: HTMLCanvasElement | null = null;
    let loading: AbortController | null = null;
    let disposed = false;
    let generation = 0;
    let visible = true;
    let pointerId: number | undefined;
    let activeKey: string | undefined;
    let ready = false;

    const allowed = () => !preference?.matches && !connection?.saveData;

    const showPoster = () => {
      ready = false;
      control.hidden = true;
      poster?.style.removeProperty("visibility");

      if (canvas) canvas.hidden = true;
    };

    const release = () => {
      const captured = pointerId;
      pointerId = undefined;
      activeKey = undefined;
      renderer?.release();

      if (captured !== undefined && control.hasPointerCapture?.(captured)) control.releasePointerCapture(captured);
    };

    const syncVisibility = () => {
      release();
      renderer?.suspend(!visible || document.hidden);
    };

    const color = (name: "leaf" | "resin" | "cloud" | "ink") => {
      // Resolve CSS colors through Canvas 2D, including color-mix/oklch tokens.
      const probe = document.createElement("span");

      // Literal utilities keep these tokens in Tailwind’s production output.
      const fills = { leaf: "bg-leaf", resin: "bg-resin", cloud: "bg-cloud", ink: "bg-ink" };

      probe.className = fills[name];
      specimen.append(probe);
      const resolved = getComputedStyle(probe).backgroundColor;

      probe.remove();
      const context = document.createElement("canvas").getContext("2d");

      if (!context) throw new Error("Color conversion unavailable");

      context.fillStyle = resolved;
      context.fillRect(0, 0, 1, 1);

      return Array.from(context.getImageData(0, 0, 1, 1).data).slice(0, 3).map((channel) => channel / 255);
    };

    const updatePreference = async () => {
      const attempt = ++generation;

      release();
      loading?.abort();
      loading = null;
      renderer?.dispose();
      renderer = null;
      canvas?.remove();
      canvas = null;
      showPoster();

      if (!allowed() || disposed) return;

      try {
        const { createAmberRenderer } = await import("@ambar/ui/lib/amber-renderer");

        if (disposed || attempt !== generation || !allowed()) return;

        const pendingCanvas = document.createElement("canvas");
        const request = new AbortController();

        canvas = pendingCanvas;
        loading = request;
        pendingCanvas.className = "absolute inset-0 size-full [&[hidden]]:hidden";
        pendingCanvas.setAttribute("aria-hidden", "true");
        pendingCanvas.hidden = true;
        drop.append(pendingCanvas);

        const candidate = await createAmberRenderer(pendingCanvas, {
          leaf: color("leaf"), resin: color("resin"),
          background: color(specimen.dataset.amberSurface === "ink" ? "ink" : "cloud"),
          small: specimen.dataset.amberSize === "sprout",
          surfaceMapUrl: specimen.dataset.amberMap ?? "",
          signal: request.signal,
          onReady: () => {
            if (disposed || attempt !== generation || canvas !== pendingCanvas || !allowed()) return;

            ready = true;
            pendingCanvas.hidden = false;

            if (poster) poster.style.visibility = "hidden";
            control.hidden = false;
          },
          onLost: () => {
            if (disposed || attempt !== generation) return;

            release();
            showPoster();
          },
        });

        if (disposed || attempt !== generation || request.signal.aborted) {
          candidate?.dispose();
          pendingCanvas.remove();

          return;
        }

        loading = null;
        renderer = candidate;

        if (!renderer) {
          pendingCanvas.remove();
          canvas = null;

          return;
        }

        syncVisibility();
      } catch {
        if (disposed || attempt !== generation) return;

        loading?.abort();
        loading = null;
        renderer?.dispose();
        renderer = null;
        canvas?.remove();
        canvas = null;
        showPoster();
      }
    };

    const pointerPosition = (event: PointerEvent) => {
      const rect = specimen.getBoundingClientRect();

      return { x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height };
    };

    const movePointer = (event: PointerEvent) => {
      if (!ready || !allowed() || event.pointerId !== pointerId) return;

      const { x, y } = pointerPosition(event);

      renderer?.move(x, y);
    };

    control.addEventListener("pointerdown", (event) => {
      if (!ready || !allowed() || !event.isPrimary || event.button !== 0 || pointerId !== undefined || activeKey !== undefined) return;

      pointerId = event.pointerId;
      control.setPointerCapture?.(pointerId);
      const { x, y } = pointerPosition(event);

      renderer?.press(x, y);
    }, options);
    control.addEventListener("pointermove", movePointer, { ...options, passive: true });

    const endPointer = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return;

      if (event.type === "pointerup") movePointer(event);

      release();
    };

    control.addEventListener("pointerup", endPointer, options);
    control.addEventListener("pointercancel", endPointer, options);
    control.addEventListener("lostpointercapture", endPointer, options);
    control.addEventListener("keydown", (event) => {
      if (!ready || !allowed() || (event.key !== " " && event.key !== "Enter")) return;

      event.preventDefault();

      if (event.repeat || pointerId !== undefined || activeKey !== undefined) return;

      activeKey = event.key;
      renderer?.press(.5, .5);
    }, options);
    control.addEventListener("keyup", (event) => {
      if (event.key !== activeKey) return;

      event.preventDefault();
      release();
    }, options);
    control.addEventListener("click", (event) => {
      if (!ready || !allowed() || event.detail !== 0 || pointerId !== undefined || activeKey !== undefined) return;

      renderer?.press(.5, .5);
      renderer?.release();
    }, options);
    control.addEventListener("blur", release, options);
    window.addEventListener("blur", release, options);
    window.addEventListener("resize", () => renderer?.resize(), options);
    document.addEventListener("visibilitychange", syncVisibility, options);
    preference?.addEventListener?.("change", updatePreference, options);
    connection?.addEventListener?.("change", updatePreference, options);

    const observer = "IntersectionObserver" in window ? new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? false;
      syncVisibility();
    }) : null;

    const resizeObserver = "ResizeObserver" in window ? new ResizeObserver(() => renderer?.resize()) : null;

    observer?.observe(specimen);
    resizeObserver?.observe(specimen);
    void updatePreference();

    return () => {
      disposed = true;
      generation++;
      events.abort();
      observer?.disconnect();
      resizeObserver?.disconnect();
      release();
      loading?.abort();
      loading = null;
      renderer?.dispose();
      canvas?.remove();
      canvas = null;
      showPoster();
    };
  });

  return () => cleanups.forEach((cleanup) => cleanup());
}
