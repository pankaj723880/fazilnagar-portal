const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const allowedImage = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const allowedVideo = ["video/mp4", "video/webm", "video/quicktime", "video/x-matroska"];

function fileFilter(req, file, cb) {
  if (file.fieldname === "image" && allowedImage.includes(file.mimetype)) {
    return cb(null, true);
  }
  if (file.fieldname === "video" && allowedVideo.includes(file.mimetype)) {
    return cb(null, true);
  }
  cb(new Error(`Unsupported file type for field "${file.fieldname}": ${file.mimetype}`));
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB cap (mainly for video)
});

// Accept one image + one video in the same multipart form
module.exports = upload.fields([
  { name: "image", maxCount: 1 },
  { name: "video", maxCount: 1 },
]);
