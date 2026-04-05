import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Dev-only proxy to avoid CORS: frontend -> Vite -> backend
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true
      }
    }
  }
});
