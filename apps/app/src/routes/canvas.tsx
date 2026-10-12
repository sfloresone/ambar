import { CanvasScreen } from "@ambar/ui/screens/library/canvas-screen";

import { useMomentViewer } from "../moment-viewer.ts";

export function CanvasRoute() {
  return <CanvasScreen onOpenMoment={useMomentViewer().open} />;
}
