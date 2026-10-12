import { createBrowserRouter } from "react-router";

import { FULL_BLEED } from "./route-handle.ts";
import { AppLayout } from "./routes/app-layout.tsx";
import { CanvasRoute } from "./routes/canvas.tsx";
import { CollectionRoute } from "./routes/collection.tsx";
import { CollectionsRoute } from "./routes/collections.tsx";
import { MomentsRoute } from "./routes/moments.tsx";
import { NotFoundRoute } from "./routes/not-found.tsx";
import { TrashRoute } from "./routes/trash.tsx";

export const router = createBrowserRouter([
  {
    Component: AppLayout,
    children: [
      { index: true, Component: MomentsRoute },
      { path: "collections", Component: CollectionsRoute },
      { path: "collections/:collectionId", Component: CollectionRoute },
      { path: "canvas", Component: CanvasRoute, handle: FULL_BLEED },
      { path: "trash", Component: TrashRoute },
      // Lazy: signed-in visitors never need the sign-in flow, and settings is rarely opened.
      { path: "login", lazy: async () => ({ Component: (await import("./routes/login.tsx")).LoginRoute }) },
      { path: "settings", lazy: async () => ({ Component: (await import("./routes/settings.tsx")).SettingsRoute }) },
      { path: "*", Component: NotFoundRoute },
    ],
  },
]);
