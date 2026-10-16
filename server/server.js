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

const allowedOrigins = [
  "https://fazilnagar.vercel.app",
  process.env.CLIENT_URL,
  ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",") : []),
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:5000",
  "http://127.0.0.1:5173",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const isAllowed =
        allowedOrigins.includes(origin) ||
        origin.endsWith(".vercel.app") ||
        /^https?:\/\/localhost(:\d+)?$/.test(origin) ||
        /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin);
      if (isAllowed) {
        return callback(null, true);
      }
      return callback(new Error("CORS policy violation: Access denied from this origin"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "x-anon-id",
      "X-Anon-Id",
      "x-client-id",
      "X-Client-Id",
      "Cache-Control",
      "cache-control",
      "Pragma",
      "pragma",
      "Expires",
      "expires",
      "X-Requested-With",
      "Accept",
      "Origin",
    ],
    exposedHeaders: ["Cache-Control", "Content-Length"],
  })
);

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

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

import submissionsRoutes from "./routes/submissions.js";
import bcrypt from "bcryptjs";
import User from "./models/User.js";
import Place from "./models/Place.js";

async function seedAdminUser() {
  try {
    const adminEmail = (process.env.ADMIN_EMAIL || "admin@fazilnagar.com").trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || "Admin@Fazilnagar2026";
    const adminName = process.env.ADMIN_NAME || "Admin";

    const existingAdmin = await User.findOne({ email: adminEmail });
    if (!existingAdmin) {
      console.log(`[AdminSeed] Creating default Admin user: ${adminEmail}...`);
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(adminPassword, salt);
      await User.create({
        name: adminName,
        email: adminEmail,
        password: hashedPassword,
        role: "admin",
      });
      console.log(`[AdminSeed] Default Admin created successfully (${adminEmail}).`);
    } else {
      let needsSave = false;
      if (existingAdmin.role !== "admin") {
        existingAdmin.role = "admin";
        needsSave = true;
      }
      if (existingAdmin.name === "Fazilnagar Portal Administrator") {
        existingAdmin.name = "Admin";
        needsSave = true;
      }
      if (needsSave) {
        await existingAdmin.save();
        console.log(`[AdminSeed] Updated existing admin ${adminEmail}.`);
      }
    }
  } catch (err) {
    console.warn("[AdminSeed] Admin seed warning:", err.message);
  }
}

async function autoSeedPlaces() {
  try {
    const existingCount = await Place.countDocuments();
    if (existingCount > 0) {
      console.log(`[AutoSeed] Preserving ${existingCount} existing place records; startup seed skipped.`);
      return;
    }

    const raw = fs.readFileSync(path.join(__dirname, "data/places.json"), "utf8");
    const places = JSON.parse(raw);
    console.log(`[AutoSeed] Database is empty; seeding ${places.length} canonical places into MongoDB...`);
    for (const p of places) {
      await Place.findOneAndUpdate(
        { slug: p.slug },
        { ...p },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
    console.log(`[AutoSeed] Database successfully synchronized with ${places.length} places.`);
  } catch (e) {
    console.warn("[AutoSeed] Background seed error:", e.message);
  }
}

import advertisementsRoutes from "./routes/advertisements.js";
import googleDriveRoutes from "./routes/googleDrive.js";
import usersRoutes from "./routes/users.js";
import notificationsRoutes from "./routes/notifications.js";
import settingsRoutes from "./routes/settings.js";
import servicesRoutes from "./routes/services.js";
import eventsRoutes from "./routes/events.js";
import heritageRoutes from "./routes/heritage.js";
import mediaRoutes from "./routes/media.js";
import auditRoutes from "./routes/audit.js";
import civicDirectoryRoutes from "./routes/civicDirectory.js";
import { authLimiter, writeLimiter, searchLimiter } from "./middleware/rateLimiter.js";

// Connect DB & Routes
connectDB().then(() => {
  autoSeedPlaces();
  seedAdminUser();
});

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/places", searchLimiter, placesRoutes);
app.use("/api/submissions", writeLimiter, submissionsRoutes);
app.use("/api/advertisements", advertisementsRoutes);
app.use("/api/google-drive", googleDriveRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/services", servicesRoutes);
app.use("/api/events", eventsRoutes);
app.use("/api/heritage", heritageRoutes);
app.use("/api/media", mediaRoutes);
app.use("/api/audit", auditRoutes);
app.use("/api/civic-directory", civicDirectoryRoutes);

// Fallback mounts in case client calls without /api prefix
app.use("/auth", authRoutes);
app.use("/news", newsRoutes);
app.use("/places", placesRoutes);
app.use("/submissions", submissionsRoutes);
app.use("/advertisements", advertisementsRoutes);
app.use("/google-drive", googleDriveRoutes);
app.use("/users", usersRoutes);
app.use("/notifications", notificationsRoutes);
app.use("/settings", settingsRoutes);
app.use("/services", servicesRoutes);
app.use("/events", eventsRoutes);
app.use("/heritage", heritageRoutes);
app.use("/media", mediaRoutes);
app.use("/audit", auditRoutes);
app.use("/civic-directory", civicDirectoryRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));