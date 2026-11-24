import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("./react-app", import.meta.url));

export default defineConfig({
  root: projectRoot,
  plugins: [react(), tailwindcss()],
  base: "./",
  build: {
    outDir: "../dist-react",
    emptyOutDir: true,
  },
});