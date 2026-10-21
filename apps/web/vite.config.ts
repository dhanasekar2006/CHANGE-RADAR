import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Mirrors `paths` in tsconfig.json; "/src" is resolved against the Vite root.
    alias: { "@": "/src" },
  },
  build: {
    rollupOptions: {
      output: {
        // Long-lived vendor chunks cache across deploys; app code changes far more often.
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          query: ["@tanstack/react-query", "zustand"],
          icons: ["lucide-react"],
        },
      },
    },
  },
  server: {
    port: 5173,
  },
});
