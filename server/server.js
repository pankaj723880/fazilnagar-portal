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

import submissionsRoutes from "./routes/submissions.js";
import bcrypt from "bcryptjs";
import User from "./models/User.js";
import Place from "./models/Place.js";

async function seedAdminUser() {
  try {
    const adminEmail = (process.env.ADMIN_EMAIL || "admin@fazilnagar.com").trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || "Admin@Fazilnagar2026";
    const adminName = process.env.ADMIN_NAME || "Fazilnagar Portal Administrator";

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
    } else if (existingAdmin.role !== "admin") {
      existingAdmin.role = "admin";
      await existingAdmin.save();
      console.log(`[AdminSeed] Existing user ${adminEmail} elevated to admin.`);
    }
  } catch (err) {
    console.warn("[AdminSeed] Admin seed warning:", err.message);
  }
}

async function autoSeedPlaces() {
  try {
    const raw = fs.readFileSync(path.join(__dirname, "data/places.json"), "utf8");
    const places = JSON.parse(raw);
    const count = await Place.countDocuments();
    if (count < places.length) {
      console.log(`[AutoSeed] Seeding ${places.length} places into MongoDB...`);
      for (const p of places) {
        await Place.findOneAndUpdate(
          { slug: p.slug },
          { ...p },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      }
      console.log(`[AutoSeed] Database verified with ${places.length} places.`);
    }
  } catch (e) {
    console.warn("[AutoSeed] Background seed error:", e.message);
  }
}

// Connect DB & Routes
connectDB().then(() => {
  autoSeedPlaces();
  seedAdminUser();
});

app.use("/api/auth", authRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/places", placesRoutes);
app.use("/api/submissions", submissionsRoutes);

// Fallback mounts in case client calls without /api prefix
app.use("/auth", authRoutes);
app.use("/news", newsRoutes);
app.use("/places", placesRoutes);
app.use("/submissions", submissionsRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));