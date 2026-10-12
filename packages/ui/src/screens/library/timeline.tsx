// Moments in time, the way memory works: Today, Yesterday, This week, then months. A masonry of cards
// whose column count follows the space it is given (container queries), so the same timeline fits an
// extension popup, a phone, a desktop window and the web.
import { groupByTime, type Moment } from "@ambar/core";

import { cn } from "../../lib/utils.ts";
import { MomentCard } from "./moment-card.tsx";

/** Columns per density, capped by the space the timeline gets (a phone never gets four). */
const COLUMNS = {
  2: "columns-2",
  3: "columns-2 @2xl:columns-3",
  4: "columns-2 @2xl:columns-3 @4xl:columns-4",
} as const;

type TimelineProps = {
  moments: Moment[];
  onOpen: (moment: Moment) => void;
  /** Most columns to use (2×2, 3×3, 4×4). */
  columns?: keyof typeof COLUMNS;
};

export function Timeline({ moments, onOpen, columns = 4 }: TimelineProps) {
  return (
    <div className="flex flex-col gap-10">
      {groupByTime(moments).map((group) => (
        <section key={group.label} aria-label={group.label} className="flex flex-col gap-4">
          <h2 className="text-sm font-medium text-muted-foreground">{group.label}</h2>
          <ul className={cn("gap-4", COLUMNS[columns])}>
            {group.moments.map((moment) => (
              <li key={moment.id} className="mb-4 break-inside-avoid">
                <MomentCard moment={moment} onOpen={onOpen} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
