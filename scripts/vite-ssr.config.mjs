import { defineConfig } from "vite";

export default defineConfig({
  base: "/",
  plugins: [],
  build: {
    target: "es2020",
    ssr: "src/game/engine.ts",
    rollupOptions: {
      output: { format: "es" },
    },
  },
});
