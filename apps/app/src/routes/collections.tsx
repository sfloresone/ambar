import { CollectionsScreen } from "@ambar/ui/screens/library/collections-screen";
import { useNavigate } from "react-router";

export function CollectionsRoute() {
  const navigate = useNavigate();

  return <CollectionsScreen onOpenCollection={(collection) => navigate(`/collections/${collection.id}`)} />;
}
