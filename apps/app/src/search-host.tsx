import { SearchPalette, type Destination } from "@ambar/ui/screens/library/search-palette";
import { FoldersIcon, FrameCornersIcon, GearSixIcon, ImagesIcon, TrashIcon } from "@phosphor-icons/react";
import { useNavigate } from "react-router";

import { useMomentViewer } from "./moment-viewer.ts";

type SearchHostProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** The ⌘K palette wired to the app's routes. */
export function SearchHost({ open, onOpenChange }: SearchHostProps) {
  const navigate = useNavigate();
  const viewer = useMomentViewer();

  const destinations: Destination[] = [
    { id: "moments", label: "Moments", icon: <ImagesIcon weight="bold" className="size-5" />, go: () => navigate("/") },
    { id: "collections", label: "Collections", icon: <FoldersIcon weight="bold" className="size-5" />, go: () => navigate("/collections") },
    { id: "canvas", label: "Canvas", icon: <FrameCornersIcon weight="bold" className="size-5" />, go: () => navigate("/canvas") },
    { id: "trash", label: "Trash", icon: <TrashIcon weight="bold" className="size-5" />, go: () => navigate("/trash") },
    { id: "settings", label: "Settings", icon: <GearSixIcon weight="bold" className="size-5" />, go: () => navigate("/settings") },
  ];

  return (
    <SearchPalette
      open={open}
      onOpenChange={onOpenChange}
      destinations={destinations}
      onOpenMoment={viewer.open}
      onOpenCollection={(collection) => navigate(`/collections/${collection.id}`)}
      // The library runs on mock data and a simulated agent until the API serves them.
      simulated
    />
  );
}
