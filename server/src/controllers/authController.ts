import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "secret";

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

  const token = jwt.sign({ id: user.id, email: user.email, name: user.name, last_name: user.last_name, role: user.role, isAffiliate: user.isAffiliate}, JWT_SECRET, {
    expiresIn: "2h",
  });

  res.json({ token });
};
