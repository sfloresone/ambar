// A continuous masonry, newest first: dates live in the cards so mixed proportions can fill the gaps.
// Container queries keep the same screen usable in an extension, a phone and a desktop window.
import type { Moment } from "@ambar/core";

import { MomentCard } from "./moment-card.tsx";
import { MomentGrid } from "./moment-grid.tsx";
import { MOMENT_COLUMNS } from "./moments-view.ts";

type TimelineProps = {
  moments: Moment[];
  onOpen: (moment: Moment) => void;
  /** Most columns to use (2×2, 3×3, 4×4). */
  columns?: keyof typeof MOMENT_COLUMNS;
};

export function Timeline({ moments, onOpen, columns = 3 }: TimelineProps) {
  const newestFirst = moments.toSorted((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  return (
    <MomentGrid columns={columns} label="Moments, newest first">
      {newestFirst.map((moment) => (
        <li key={moment.id} className="min-w-0 pb-5 @4xl:pb-6">
          <MomentCard moment={moment} onOpen={onOpen} />
        </li>
      ))}
    </MomentGrid>
  );
}
