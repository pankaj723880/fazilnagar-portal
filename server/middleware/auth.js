import jwt from "jsonwebtoken";

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Access denied. No token provided." });
  }

  const token = authHeader.split(" ")[1];
  
  if (!token || token === "undefined" || token === "null") {
    return res.status(401).json({ message: "Invalid or expired token." });
  }

  try {
    const secretKey = process.env.JWT_SECRET || "fallback_secret_key";
    const verified = jwt.verify(token, secretKey);
    req.user = verified;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
};

export default verifyToken;