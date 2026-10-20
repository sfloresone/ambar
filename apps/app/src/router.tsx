import { createBrowserRouter } from "react-router";

import { FULL_BLEED } from "./route-handle.ts";
import { AppLayout } from "./routes/app-layout.tsx";
import { CanvasRoute } from "./routes/canvas.tsx";
import { CollectionRoute } from "./routes/collection.tsx";
import { CollectionsRoute } from "./routes/collections.tsx";
import { MomentsRoute } from "./routes/moments.tsx";
import { NotFoundRoute } from "./routes/not-found.tsx";
import { RequireSession } from "./routes/require-session.tsx";
import { TrashRoute } from "./routes/trash.tsx";

export const router = createBrowserRouter([
  {
    Component: AppLayout,
    children: [
      // Public: email links and Google/GitHub come back here. Lazy: signed-in visitors never need it.
      { path: "login", lazy: async () => ({ Component: (await import("./routes/login.tsx")).LoginRoute }) },
      // Private: the user's library. A new route goes here unless it is meant for anyone.
      {
        Component: RequireSession,
        children: [
          { index: true, Component: MomentsRoute },
          { path: "collections", Component: CollectionsRoute },
          { path: "collections/:collectionId", Component: CollectionRoute },
          { path: "canvas", Component: CanvasRoute, handle: FULL_BLEED },
          { path: "trash", Component: TrashRoute },
          // Lazy: rarely opened.
          { path: "settings", lazy: async () => ({ Component: (await import("./routes/settings.tsx")).SettingsRoute }) },
          // Inside too: a signed-out visitor never learns which paths exist.
          { path: "*", Component: NotFoundRoute },
        ],
      },
    ],
  },
]);
