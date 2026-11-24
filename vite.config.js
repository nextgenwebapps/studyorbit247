import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

const entry = (path) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: "./",
  build: {
    outDir: "dist-react",
    rollupOptions: {
      input: {
        home: entry("./index.html"),
        student: entry("./user/index.html"),
        mocktest: entry("./mocktest/index.html"),
        adminLogin: entry("./admin/index.html"),
        adminDashboard: entry("./admin/app.html"),
        destructionPreview: entry("./destruction-preview/index.html"),
      },
    },
  },
});
