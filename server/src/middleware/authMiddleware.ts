import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "secret";

export interface AuthRequest extends Request {
  user?: any;
}

export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  
  if (!token) {
    console.log("❌ No token provided");
    return res.status(401).json({ message: "Access token required" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.log("❌ Token verification failed:", err.message);
      
      // Wenn Token abgelaufen ist, sende 401 (für automatisches Frontend-Logout)
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ message: "Token expired", error: "TOKEN_EXPIRED" });
      }
      
      // Andere JWT-Fehler (ungültiges Format, etc.) senden 403
      return res.status(403).json({ message: "Invalid token", error: "INVALID_TOKEN" });
    }
    
    console.log("✅ Token verified for user:", user);
    req.user = user;
    next();
  });
};