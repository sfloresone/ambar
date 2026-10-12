import { LibraryScreen } from "@ambar/ui/screens/library/library-screen";

import { useMomentViewer } from "../moment-viewer.ts";

export function MomentsRoute() {
  return <LibraryScreen onOpenMoment={useMomentViewer().open} />;
}
