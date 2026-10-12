import { useMatches } from "react-router";
import * as v from "valibot";

/** Route handle for screens that take the whole window (the Canvas): no page frame, idle-hiding header. */
const FullBleed = v.object({ fullBleed: v.literal(true) });

export const FULL_BLEED = v.parse(FullBleed, { fullBleed: true });

export function useFullBleed(): boolean {
  return useMatches().some((match) => v.is(FullBleed, match.handle));
}
