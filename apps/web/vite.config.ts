import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Mirrors `paths` in tsconfig.json; "/src" is resolved against the Vite root.
    alias: { "@": "/src" },
  },
  server: {
    port: 5173,
  },
});
