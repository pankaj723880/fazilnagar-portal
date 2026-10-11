import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import connectDB from "./config/db.js";
import authRoutes from "./routes/auth.js";
import newsRoutes from "./routes/news.js";
import placesRoutes from "./routes/places.js";

dotenv.config();
const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());

// Serve uploaded media files publicly
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Connect DB & Routes
connectDB();
app.use("/api/auth", authRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/places", placesRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));