import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import connectDB, { dbConnectionError, detectedUriSource } from "./config/db.js";
import authRoutes from "./routes/auth.js";
import newsRoutes from "./routes/news.js";
import placesRoutes from "./routes/places.js";

dotenv.config();
const app = express();

import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

// Serve uploaded media files publicly
app.use("/uploads", express.static(uploadsDir));

// Root health check endpoint
app.get(["/", "/health", "/api/health"], (req, res) => {
  const states = ["disconnected", "connected", "connecting", "disconnecting"];
  const dbState = states[mongoose.connection.readyState] || "unknown";
  res.json({
    status: dbState === "connected" ? "healthy" : "database_issue",
    database: dbState,
    databaseHost: mongoose.connection.host || null,
    uriSource: detectedUriSource,
    dbConnectionError: dbConnectionError || null,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// Connect DB & Routes
connectDB();
app.use("/api/auth", authRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/places", placesRoutes);

// Fallback mounts in case client calls without /api prefix
app.use("/auth", authRoutes);
app.use("/news", newsRoutes);
app.use("/places", placesRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));