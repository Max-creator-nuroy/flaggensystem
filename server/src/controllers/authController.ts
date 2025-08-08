import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import nodemailer from "nodemailer";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "secret";

// Temporärer Token-Speicher (in Produktion sollte das in der Datenbank sein)
const resetTokens = new Map<string, { userId: string, expires: Date }>();

export const register = async (req: Request, res: Response) => {
  const { email, password, name, last_name, role } = req.body;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) return res.status(400).json({ message: "User existiert" });

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      password: hashed,
      name,
      last_name,
      role, // z.B. "USER" oder "ADMIN"
    },
  });

  res.status(201).json({ message: "User erstellt", userId: user.id });
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ message: "User nicht gefunden" });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ message: "Falsches Passwort" });

  const token = jwt.sign({ id: user.id, email: user.email, name: user.name, last_name: user.last_name, role: user.role, isAffiliate: user.isAffiliate, isCustomer: (user as any).isCustomer ?? true }, JWT_SECRET, {
    expiresIn: "2h",
  });

  res.json({ token });
};

export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: "Benutzer mit dieser E-Mail nicht gefunden" });
    }

    // Erstelle einen sicheren Reset-Token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 Stunde gültig

    // Speichere den Token temporär (in Produktion: Datenbank)
    resetTokens.set(resetToken, { userId: user.id, expires: resetTokenExpiry });
    
    // Erstelle den Reset-Link
    const resetLink = `http://localhost:5173/resetPassword?token=${resetToken}&userId=${user.id}`;
    
    // E-Mail-Transporter konfigurieren (für Entwicklung)
    const transporter = nodemailer.createTransport({
      service: 'gmail', // oder anderer SMTP-Service
      auth: {
        user: "kraeft98@gmail.com",
        pass: "2812mava"
      }
    });
    
    try {
      // E-Mail senden
      await transporter.sendMail({
        from: `"Flaggensystem" <${"kraeft98@gmail.com"}>`,
        to: email,
        subject: 'Passwort zurücksetzen - Flaggensystem',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">Passwort zurücksetzen</h1>
            <p>Hallo,</p>
            <p>Sie haben eine Anfrage zum Zurücksetzen Ihres Passworts gestellt.</p>
            <p>Klicken Sie auf den folgenden Button, um Ihr Passwort zurückzusetzen:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" 
                 style="background-color: #4CAF50; color: white; padding: 14px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">
                Passwort zurücksetzen
              </a>
            </div>
            <p>Oder kopieren Sie diesen Link in Ihren Browser:</p>
            <p style="word-break: break-all; color: #666;">${resetLink}</p>
            <p><strong>Wichtig:</strong> Dieser Link ist nur 1 Stunde gültig.</p>
            <p>Falls Sie diese Anfrage nicht gestellt haben, ignorieren Sie diese E-Mail.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #666; font-size: 12px;">Diese E-Mail wurde automatisch generiert. Bitte antworten Sie nicht auf diese E-Mail.</p>
          </div>
        `
      });

      console.log(`Reset-E-Mail gesendet an: ${email}`);
      
      res.json({ 
        message: "Reset-Link wurde an Ihre E-Mail-Adresse gesendet",
      });
    } catch (emailError) {
      console.error('Fehler beim E-Mail-Versand:', emailError);
      
      // Fallback: Reset-Link in Console ausgeben
      console.log(`Fallback - Reset-Link für ${email}: ${resetLink}`);
      
      res.json({ 
        message: "Reset-Link wurde erstellt (E-Mail-Service temporär nicht verfügbar)",
        devLink: resetLink // Nur für Entwicklung
      });
    }
  } catch (error) {
    console.error('Fehler beim Erstellen des Reset-Links:', error);
    res.status(500).json({ message: "Interner Serverfehler" });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  const { token, userId, newPassword } = req.body;

  try {
    // Validiere Input
    if (!token || !userId || !newPassword) {
      return res.status(400).json({ message: "Token, User-ID und neues Passwort sind erforderlich" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Passwort muss mindestens 6 Zeichen lang sein" });
    }

    // Validiere Token
    const tokenData = resetTokens.get(token);
    if (!tokenData) {
      return res.status(400).json({ message: "Ungültiger oder abgelaufener Reset-Token" });
    }

    if (tokenData.expires < new Date()) {
      resetTokens.delete(token); // Abgelaufenen Token löschen
      return res.status(400).json({ message: "Reset-Token ist abgelaufen. Bitte fordern Sie einen neuen an." });
    }

    if (tokenData.userId !== userId) {
      return res.status(400).json({ message: "Token gehört nicht zu diesem Benutzer" });
    }

    // Finde den Benutzer
    const user = await prisma.user.findUnique({ 
      where: { id: userId } 
    });

    if (!user) {
      return res.status(404).json({ message: "Benutzer nicht gefunden" });
    }

    // In der Produktion würdest du hier den Token aus der Datenbank validieren
    // Für jetzt nehmen wir einfach an, dass der Token gültig ist
    // TODO: Token-Validierung implementieren
    
    // Hash das neue Passwort
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update das Passwort in der Datenbank
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    // Token löschen (kann nur einmal verwendet werden)
    resetTokens.delete(token);

    res.json({ message: "Passwort erfolgreich zurückgesetzt" });
  } catch (error) {
    console.error('Fehler beim Zurücksetzen des Passworts:', error);
    res.status(500).json({ message: "Interner Serverfehler" });
  }
};
