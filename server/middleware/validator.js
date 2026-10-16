/**
 * Zero-dependency Request Schema Validation Middleware
 * Validates and sanitizes incoming user input on write, auth, and search endpoints.
 */

// Basic email regex conforming to HTML5 standard
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;

export const validateLoginInput = (req, res, next) => {
  const { email, password } = req.body || {};
  if (!email || typeof email !== "string" || !EMAIL_REGEX.test(email.trim())) {
    return res.status(400).json({ success: false, message: "A valid email address is required." });
  }
  if (!password || typeof password !== "string" || password.length < 1) {
    return res.status(400).json({ success: false, message: "Password is required." });
  }
  req.body.email = email.trim().toLowerCase();
  next();
};

export const validateRegisterInput = (req, res, next) => {
  const { name, email, password } = req.body || {};
  if (!name || typeof name !== "string" || name.trim().length < 2 || name.trim().length > 100) {
    return res.status(400).json({ success: false, message: "Name must be between 2 and 100 characters." });
  }
  if (!email || typeof email !== "string" || !EMAIL_REGEX.test(email.trim())) {
    return res.status(400).json({ success: false, message: "A valid email address is required." });
  }
  if (!password || typeof password !== "string" || password.length < 6 || password.length > 128) {
    return res.status(400).json({ success: false, message: "Password must be at least 6 characters long." });
  }
  req.body.name = name.trim();
  req.body.email = email.trim().toLowerCase();
  next();
};

export const validateSearchQuery = (req, res, next) => {
  if (req.query.q) {
    const q = String(req.query.q).slice(0, 100).replace(/[\x00-\x1F\x7F]/g, "").trim();
    req.query.q = q;
  }
  next();
};

export const validatePlaceInput = (req, res, next) => {
  const { name, category, latitude, longitude } = req.body || {};
  if (!name || typeof name !== "string" || name.trim().length < 2 || name.trim().length > 150) {
    return res.status(400).json({ success: false, message: "Place name is required (2 to 150 characters)." });
  }
  if (!category || typeof category !== "string") {
    return res.status(400).json({ success: false, message: "Valid category is required." });
  }
  if (latitude !== undefined && latitude !== null && latitude !== "") {
    const lat = parseFloat(latitude);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      return res.status(400).json({ success: false, message: "Latitude must be a valid number between -90 and 90." });
    }
  }
  if (longitude !== undefined && longitude !== null && longitude !== "") {
    const lng = parseFloat(longitude);
    if (isNaN(lng) || lng < -180 || lng > 180) {
      return res.status(400).json({ success: false, message: "Longitude must be a valid number between -180 and 180." });
    }
  }
  next();
};
