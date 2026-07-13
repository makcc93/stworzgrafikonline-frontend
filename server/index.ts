import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { handleDemo } from "./routes/demo.js";
import { handleLogin, handleRegister } from "./routes/auth.js";

// Definicja __dirname dla ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // API routes (must be defined BEFORE static files)
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // // Authentication routes
  // app.post("/api/auth/login", handleLogin);
  // app.post("/api/auth/register", handleRegister);

  // Serve static files from React build
  // In development, Vite handles static files, so we only need this for production
  const spaPath = path.join(__dirname, "../../dist/spa");
  
  // Only try to serve static files if the directory exists (production mode)
  if (fs.existsSync(spaPath)) {
    app.use(express.static(spaPath));
    
    // SPA fallback - NIE używaj app.get("*") w Express 5!
    app.use((_req, res) => {
      res.sendFile(path.join(spaPath, "index.html"));
    });
  }

  return app;
}