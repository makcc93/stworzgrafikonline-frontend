import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, "server/production.ts"),
      formats: ["es"],
      fileName: () => "production.mjs",
    },
    outDir: "dist/server",
    ssr: true,
    rollupOptions: {
      external: [
        "express",
        "cors",
        "dotenv",
        /^node:.*/,
      ],
    },
  },
});