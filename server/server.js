import http from "http";
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
import profileRoutes from "./routes/profile.js";
import messagesRoutes from "./routes/messages.js";
import mongoSanitize from "./middleware/mongoSanitize.js";
import { initSocket } from "./socket.js";

dotenv.config();
const app = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");

// Enforce HTTPS in production behind reverse proxies (Render / Vercel)
if (process.env.NODE_ENV === "production") {
  app.use((req, res, next) => {
    if (req.headers["x-forwarded-proto"] && req.headers["x-forwarded-proto"] !== "https") {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
  });
}

// Reject unsupported or hazardous HTTP methods (e.g. TRACE, TRACK)
app.use((req, res, next) => {
  const allowedMethods = ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"];
  if (!allowedMethods.includes(req.method)) {
    return res.status(405).json({
      success: false,
      message: `HTTP method ${req.method} is not allowed.`,
    });
  }
  next();
});

// Sensible request timeouts (30s) to protect server socket resources
app.use((req, res, next) => {
  req.setTimeout(30000, () => {
    if (!res.headersSent) {
      res.status(408).json({
        success: false,
        message: "Request timeout. The server took too long to respond.",
      });
    }
  });
  next();
});

import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
import { isOriginAllowed, getAllowedOrigins } from "./utils/corsConfig.js";

app.use(
  cors({
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
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
      "Range",
      "range",
    ],
    exposedHeaders: [
      "Cache-Control",
      "Content-Length",
      "Content-Range",
      "Accept-Ranges",
      "Content-Type",
    ],
  })
);

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(self)");
  next();
});

// Enforce Content-Security-Policy for API endpoints
app.use("/api", (req, res, next) => {
  res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none';");
  next();
});

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
app.use(mongoSanitize);

// Serve uploaded media files publicly with cross-origin resource policy enabled
app.use(
  "/uploads",
  (req, res, next) => {
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    next();
  },
  express.static(uploadsDir)
);

// Root health check endpoint (sanitized to avoid internal host/connection string leakage)
app.get(["/", "/health", "/api/health"], (req, res) => {
  const states = ["disconnected", "connected", "connecting", "disconnecting"];
  const dbState = states[mongoose.connection.readyState] || "unknown";
  const isHealthy = dbState === "connected";
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? "healthy" : "database_issue",
    database: dbState,
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
        isEmailVerified: true,
        authProvider: "local",
      });
      console.log(`[AdminSeed] Default Admin created successfully (${adminEmail}).`);
    } else {
      let needsSave = false;
      if (existingAdmin.role !== "admin") {
        existingAdmin.role = "admin";
        needsSave = true;
      }
      if (!existingAdmin.isEmailVerified) {
        existingAdmin.isEmailVerified = true;
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
import formsRoutes from "./routes/forms.js";
import contributionSubmissionsRoutes from "./routes/contributionSubmissions.js";
import { authLimiter, writeLimiter, searchLimiter } from "./middleware/rateLimiter.js";
import seedMapEntities from "./config/seedMapEntities.js";

// Connect DB & Routes
connectDB().then(() => {
  autoSeedPlaces();
  seedMapEntities();
  seedAdminUser();
});

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/places", searchLimiter, placesRoutes);
app.use("/api/submissions", writeLimiter, submissionsRoutes);
app.use("/api/forms", formsRoutes);
app.use("/api/contributions", writeLimiter, contributionSubmissionsRoutes);
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
app.use("/api/profile", profileRoutes);
app.use("/api/messages", messagesRoutes);

// Fallback mounts in case client calls without /api prefix
app.use("/auth", authLimiter, authRoutes);
app.use("/news", newsRoutes);
app.use("/places", searchLimiter, placesRoutes);
app.use("/submissions", writeLimiter, submissionsRoutes);
app.use("/forms", formsRoutes);
app.use("/contributions", writeLimiter, contributionSubmissionsRoutes);
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
app.use("/profile", profileRoutes);
app.use("/messages", messagesRoutes);

// 404 JSON handler for unmapped API routes
app.all("/api/*", (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint ${req.method} ${req.originalUrl} not found.`,
  });
});

// Centralized Express Error Handler
// Prevents unhandled exceptions, CORS violations, or malformed JSON from returning raw HTML stack traces
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({
      success: false,
      message: "Malformed JSON payload received.",
    });
  }

  if (err.message && err.message.includes("CORS")) {
    return res.status(403).json({
      success: false,
      message: err.message,
    });
  }

  const statusCode = err.status || err.statusCode || 500;
  if (process.env.NODE_ENV !== "test") {
    console.error(`[API Error] ${req.method} ${req.originalUrl} - ${err.message}`);
  }

  // Sanitize 500 responses in production to avoid leaking internal database or system details
  const clientMessage =
    statusCode >= 500 && process.env.NODE_ENV === "production"
      ? "An unexpected internal server error occurred."
      : err.message || "An unexpected error occurred.";

  res.status(statusCode).json({
    success: false,
    message: clientMessage,
    ...(process.env.NODE_ENV === "development" ? { stack: err.stack } : {}),
  });
});

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);
initSocket(server);

server.listen(PORT, () => console.log(`Server running with Socket.IO on port ${PORT}`));