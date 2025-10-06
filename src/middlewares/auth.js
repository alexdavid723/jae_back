// src/middlewares/auth.js
import jwt from "jsonwebtoken";
import prisma from "../prisma.js";

export default async function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ message: "No autorizado" });

  const token = header.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No autorizado" });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: payload.userId }, include: { role: true } });
    if (!user) return res.status(401).json({ message: "Usuario no existe" });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Token inválido o expirado" });
  }
}
