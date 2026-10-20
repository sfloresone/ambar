// Interior Load More's interaction pattern (https://www.interior.dev/docs/load-more), adapted to
// locally available moments. This reveals rows; it does not fetch or discard library data.
import { useEffect, useEffectEvent, useRef, useState, type RefObject } from "react";

const BATCH_SIZE = 50;

const MAX_AUTO_LOADS = 3;

export function useMomentBatches(total: number, minimum: number, scroll: RefObject<HTMLElement | null>, split: boolean) {
  const [limit, setLimit] = useState(BATCH_SIZE);
  const sentinel = useRef<HTMLDivElement>(null);
  const autoLoads = useRef(0);
  const count = Math.min(total, Math.max(limit, minimum));
  const hasMore = count < total;

  function loadMore() {
    autoLoads.current = 0;
    setLimit(count + BATCH_SIZE);
  }

  const reveal = useEffectEvent(() => {
    if (autoLoads.current < MAX_AUTO_LOADS && hasMore) {
      autoLoads.current += 1;
      setLimit(count + BATCH_SIZE);
    }
  });

  useEffect(() => {
    const element = sentinel.current;

    if (!hasMore || element === null || typeof IntersectionObserver === "undefined") return;

    let active = true;

    const observer = new IntersectionObserver(([entry]) => {
      if (!active) return;

      if (entry?.isIntersecting) {
        reveal();
      } else {
        autoLoads.current = 0;
      }
    }, { root: split ? scroll.current : null, rootMargin: "600px 0px" });

    observer.observe(element);

    return () => {
      active = false;
      observer.disconnect();
    };
  }, [count, hasMore, scroll, split]);

  return { count, hasMore, sentinel, loadMore };
}
