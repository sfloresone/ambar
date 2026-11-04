import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";

import "@ambar/ui/globals.css";
import { ThemeProvider } from "@ambar/ui/components/theme-provider";
import { router } from "./router.tsx";

const root = document.getElementById("root");

if (root === null) {
  throw new Error("Missing #root element in index.html");
}

createRoot(root).render(
  <StrictMode>
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>
  </StrictMode>,
);
