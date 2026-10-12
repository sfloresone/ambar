import { MomentViewer } from "@ambar/ui/screens/library/moment-viewer";
import { useLibrary } from "@ambar/ui/screens/library/library-context";

import { useMomentViewer } from "./moment-viewer.ts";

/** The moment viewer for every section (Moments, a collection, the Canvas, search): driven by ?m=. */
export function MomentViewerHost() {
  const { moments } = useLibrary();
  const viewer = useMomentViewer();

  return <MomentViewer moment={moments?.find((moment) => moment.id === viewer.viewingId) ?? null} onClose={viewer.close} />;
}
