import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const safeExt = path.extname(file.originalname || "").toLowerCase();
    cb(null, `${unique}${safeExt}`);
  },
});

const allowedImage = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
const allowedVideo = ["video/mp4", "video/webm", "video/quicktime", "video/x-matroska", "video/ogg"];
const allowedAudio = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/wave",
  "audio/x-wav",
  "audio/ogg",
  "audio/webm",
  "audio/aac",
  "audio/m4a",
  "audio/x-m4a",
  "audio/mp4",
];
const allowedDocs = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

const BLOCKED_EXTENSIONS = [
  ".exe", ".bat", ".cmd", ".sh", ".php", ".vbs", ".msi", ".jar", ".scr", ".com", ".pif", ".js", ".bin"
];

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname || "").toLowerCase();
  if (BLOCKED_EXTENSIONS.includes(ext)) {
    return cb(new Error(`File extension "${ext}" is blocked for security reasons.`));
  }

  const mime = (file.mimetype || "").toLowerCase();
  const isImage = allowedImage.includes(mime) || [".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"].includes(ext);
  const isVideo = allowedVideo.includes(mime) || [".mp4", ".webm", ".mov", ".mkv"].includes(ext);
  const isAudio = allowedAudio.includes(mime) || [".mp3", ".wav", ".m4a", ".ogg", ".aac"].includes(ext);
  const isDoc = allowedDocs.includes(mime) || [".pdf", ".doc", ".docx", ".txt"].includes(ext);

  if (isImage || isVideo || isAudio || isDoc) {
    return cb(null, true);
  }

  cb(new Error(`Unsupported file type: ${mime || ext}`));
}

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB cap
});

// Accept image, video, audio, or document fields in multipart forms
export const uploadFields = upload.fields([
  { name: "image", maxCount: 1 },
  { name: "video", maxCount: 1 },
  { name: "audio", maxCount: 1 },
  { name: "document", maxCount: 1 },
  { name: "file", maxCount: 1 },
  { name: "media", maxCount: 5 },
]);

export default uploadFields;
