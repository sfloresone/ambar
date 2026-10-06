import { resolve } from "node:path";
import { markSvg } from "@ambar/ui/lib/mark-svg";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

/**
 * Inlines the mark into index.html's pre-JS iris cover as <svg>, not <img>: nothing to request or decode,
 * so it can never show the browser's broken-image placeholder (an <img> outside the app root did, in dev).
 */
function irisCoverMark(): Plugin {
  return {
    name: "ambar:iris-cover-mark",
    transformIndexHtml: (html) => html.replace("<!-- iris-mark -->", markSvg()),
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), irisCoverMark()],
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname, "./src"),
    },
  },
  server: { port: 5173 },
});
