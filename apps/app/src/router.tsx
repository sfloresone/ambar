import { createBrowserRouter } from "react-router";

import { AppLayout } from "./routes/app-layout.tsx";
import { LoginRoute } from "./routes/login.tsx";
import { MomentsRoute } from "./routes/moments.tsx";
import { NotFoundRoute } from "./routes/not-found.tsx";
import { SettingsRoute } from "./routes/settings.tsx";

export const router = createBrowserRouter([
  {
    Component: AppLayout,
    children: [
      { index: true, Component: MomentsRoute },
      { path: "login", Component: LoginRoute },
      { path: "settings", Component: SettingsRoute },
      { path: "*", Component: NotFoundRoute },
    ],
  },
]);
