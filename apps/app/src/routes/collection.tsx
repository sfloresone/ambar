import { CollectionScreen } from "@ambar/ui/screens/library/collection-screen";
import { useNavigate, useParams } from "react-router";

import { useMomentViewer } from "../moment-viewer.ts";

export function CollectionRoute() {
  const navigate = useNavigate();
  const { collectionId = "" } = useParams();

  return <CollectionScreen collectionId={collectionId} onOpenMoment={useMomentViewer().open} onBack={() => navigate("/collections")} />;
}
