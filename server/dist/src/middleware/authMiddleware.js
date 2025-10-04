"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || "secret";
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (!token) {
        console.log("❌ No token provided");
        return res.status(401).json({ message: "Access token required" });
    }
    jsonwebtoken_1.default.verify(token, JWT_SECRET, (err, user) => {
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
exports.authenticateToken = authenticateToken;
