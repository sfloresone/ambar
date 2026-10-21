// Canvas (prototype): the library laid out on one large board you move around. Opening it lands straight
// on the content selected from Moments; the header steps aside while you look. Arranging comes later.
// Panning writes the transform directly (no React render per pointer move).
import { momentImage, momentLabel, type Moment } from "@ambar/core";
import { useEffect, useEffectEvent, useRef, type PointerEvent, type WheelEvent } from "react";

import { cn } from "../../lib/utils.ts";
import { useLibrary } from "./library-context.tsx";

const COLUMNS = 6;

const CELL = { width: 300, height: 380 };

const BOARD = { padding: 120 };

/** Beyond this, a press is a drag, not a click. */
const DRAG_PX = 5;

/** A stable, hand-placed look: a little offset and turn per moment, the same every time. */
function placement(index: number) {
  const jitter = (n: number) => ((index * 9301 + n * 49297) % 233280) / 233280 - 0.5;

  return {
    x: BOARD.padding + (index % COLUMNS) * CELL.width + jitter(1) * 60,
    y: BOARD.padding + Math.floor(index / COLUMNS) * CELL.height + jitter(2) * 70,
    rotate: jitter(3) * 6,
  };
}

type CanvasScreenProps = {
  onOpenMoment: (moment: Moment) => void;
};

export function CanvasScreen({ onOpenMoment }: CanvasScreenProps) {
  const { moments } = useLibrary();
  const viewport = useRef<HTMLElement>(null);
  const board = useRef<HTMLDivElement>(null);
  const offset = useRef({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const list = moments?.filter((moment) => moment.onCanvas) ?? [];
  const rows = Math.ceil(list.length / COLUMNS);
  const width = Math.min(COLUMNS, list.length) * CELL.width + BOARD.padding * 2;
  const height = rows * CELL.height + BOARD.padding * 2;

  function apply(x: number, y: number) {
    const view = viewport.current?.getBoundingClientRect();
    const availableX = (view?.width ?? 0) - width;
    const minX = Math.min(0, availableX);
    const minY = Math.min(0, (view?.height ?? 0) - height);

    offset.current = { x: availableX > 0 ? availableX / 2 : Math.max(minX, Math.min(0, x)), y: Math.max(minY, Math.min(0, y)) };

    if (board.current) {
      board.current.style.transform = `translate3d(${offset.current.x}px, ${offset.current.y}px, 0)`;
    }
  }

  const center = useEffectEvent(() => {
    const view = viewport.current?.getBoundingClientRect();

    if (view) {
      apply((view.width - width) / 2, 0);
    }
  });

  // Start centered, once the board has its moments.
  const ready = list.length > 0;

  useEffect(() => {
    if (ready) {
      center();
    }
  }, [ready]);

  function down(event: PointerEvent<HTMLElement>) {
    drag.current = { x: event.clientX, y: event.clientY, moved: false };
  }

  function move(event: PointerEvent<HTMLElement>) {
    if (drag.current === null) {
      return;
    }

    const dx = event.clientX - drag.current.x;
    const dy = event.clientY - drag.current.y;

    if (!drag.current.moved && Math.hypot(dx, dy) > DRAG_PX) {
      drag.current.moved = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }

    if (drag.current.moved) {
      apply(offset.current.x + dx, offset.current.y + dy);
      drag.current.x = event.clientX;
      drag.current.y = event.clientY;
    }
  }

  function up() {
    // Let the click that follows a drag see it, then forget it.
    requestAnimationFrame(() => {
      drag.current = null;
    });
  }

  function wheel(event: WheelEvent<HTMLElement>) {
    apply(offset.current.x - event.deltaX, offset.current.y - event.deltaY);
  }

  /** Bring a card into view when it gets keyboard focus (moving through the board with Tab). */
  function reveal(index: number) {
    const view = viewport.current?.getBoundingClientRect();
    const { x, y } = placement(index);

    if (view) {
      apply(view.width / 2 - x - CELL.width / 2, view.height / 2 - y - CELL.height / 2);
    }
  }

  return (
    <section
      ref={viewport}
      aria-label="Canvas: drag or scroll to move around"
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onWheel={wheel}
      className="fixed inset-0 cursor-grab touch-none overflow-hidden bg-muted/60 select-none active:cursor-grabbing [background-image:radial-gradient(rgb(20_20_20/0.12)_1px,transparent_1px)] [background-size:24px_24px] dark:[background-image:radial-gradient(rgb(255_255_255/0.12)_1px,transparent_1px)]"
    >
      <h1 className="sr-only">Canvas</h1>
      {moments !== null && list.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="font-heading text-2xl font-bold">Your canvas is empty</p>
          <p className="max-w-sm text-sm text-muted-foreground">Choose “Add to Canvas” from a moment's menu to bring it here.</p>
        </div>
      )}
      <div ref={board} className="relative will-change-transform" style={{ width, height }}>
        {list.map((moment, index) => {
          const { x, y, rotate } = placement(index);
          const image = momentImage(moment);

          return (
            <button
              key={moment.id}
              type="button"
              // Keyboard only: a click also focuses, and moving the board under the pointer would lose it.
              onFocus={(event) => event.currentTarget.matches(":focus-visible") && reveal(index)}
              onClick={() => {
                if (drag.current?.moved !== true) {
                  onOpenMoment(moment);
                }
              }}
              aria-label={momentLabel(moment)}
              style={{ left: x, top: y, rotate: `${rotate}deg` }}
              className={cn(
                "absolute w-56 cursor-pointer rounded-xl bg-card p-2 pb-3 shadow-[0_2px_4px_rgb(20_20_20/0.08),0_12px_28px_rgb(20_20_20/0.12)] outline-hidden",
                "transition-[translate,box-shadow] duration-200 ease-out-soft hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-solid focus-visible:outline-ring motion-reduce:transition-none",
              )}
            >
              {image !== undefined && <img src={image} alt="" draggable={false} loading="lazy" decoding="async" className="w-full rounded-lg" />}
              <span className="block truncate px-1 pt-2 text-left text-sm font-medium">{momentLabel(moment)}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
