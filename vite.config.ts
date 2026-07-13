import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

let createServer: (() => any) | undefined;
// Nie laduj Express gdy VITE_BACKEND_URL jest ustawiony (Docker z realnym backendem)
// Express konsumuje body requestu przed proxy Vite -> backend dostaje puste body
const isDockerEnv = !!process.env.VITE_BACKEND_URL;
if (!isDockerEnv && process.env.NODE_ENV !== "production") {
  try {
    const serverModule = require("./server/index");
    createServer = serverModule.createServer;
  } catch (error) {
    console.warn("Server module not available");
  }
}

const backendUrl = process.env.VITE_BACKEND_URL || "http://localhost:8080";

export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target: backendUrl,
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on("error", (err, req, res) => {
            console.log("PROXY ERROR:", err.message, req.url);
          });
          proxy.on("proxyReq", (proxyReq, req) => {
            console.log("PROXY REQUEST:", req.method, req.url, "->", backendUrl);
          });
          proxy.on("proxyRes", (proxyRes, req) => {
            console.log("PROXY RESPONSE:", proxyRes.statusCode, req.url);
          });
        },
      },
      "/stores": {
        target: backendUrl,
        changeOrigin: true,
      },
      "/billing-period-config": {
        target: backendUrl,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist/spa",
  },
  plugins: [react(), expressPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
}));

function expressPlugin(): Plugin {
  return {
    name: "express-plugin",
    apply: "serve",
    configureServer(server) {
      if (!createServer) return;
      const app = createServer();
      server.middlewares.use(app);
    },
  };
}
