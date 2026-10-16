import jwt from "jsonwebtoken";
import RevokedToken from "../models/RevokedToken.js";
import User from "../models/User.js";

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Access denied. No token provided." });
  }

  const token = authHeader.split(" ")[1];
  
  if (!token || token === "undefined" || token === "null") {
    return res.status(401).json({ message: "Invalid or expired token." });
  }

  try {
    // Check if token has been revoked via logout
    const isRevoked = await RevokedToken.exists({ token });
    if (isRevoked) {
      return res.status(401).json({ message: "Session expired or logged out. Please log in again." });
    }

    const secretKey = process.env.JWT_SECRET || "fallback_secret_key";
    const verified = jwt.verify(token, secretKey);
    req.user = verified;
    req.token = token;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
};

export const requireAdmin = async (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Access denied. Admin privileges required." });
  }

  // Cross-verify with database to ensure admin role has not been revoked or account suspended
  try {
    if (req.user.id) {
      const dbUser = await User.findById(req.user.id).select("role status");
      if (dbUser) {
        if (dbUser.role !== "admin") {
          return res.status(403).json({ message: "Access denied. Admin privileges required." });
        }
        if (dbUser.status === "inactive" || dbUser.status === "suspended") {
          return res.status(403).json({ message: "Access denied. Account is inactive or suspended." });
        }
      }
    }
  } catch (err) {
    console.error("requireAdmin user database verification error:", err);
  }

  next();
};

export default verifyToken;