import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import type { AstroIntegration } from "astro";
import { defineConfig } from "astro/config";

import { devSections } from "./src/dev/sections.ts";

/** Design system gallery under /dev. Injected only for `astro dev`, never shipped in the build. */
function devGallery(): AstroIntegration {
  return {
    name: "ambar:dev-gallery",
    hooks: {
      "astro:config:setup": ({ command, injectRoute }) => {
        if (command !== "dev") {
          return;
        }

        injectRoute({ pattern: "/dev", entrypoint: "./src/dev/pages/index.astro" });

        for (const section of devSections) {
          injectRoute({
            pattern: `/dev/${section.slug}`,
            entrypoint: `./src/dev/pages/${section.slug}.astro`,
          });
        }
      },
    },
  };
}

export default defineConfig({
  // TODO: final domain (ambar.page or ambar.one).
  site: "https://ambar.page",
  integrations: [react(), devGallery()],
  vite: {
    plugins: [tailwindcss()],
  },
  server: { port: 4321 },
});
