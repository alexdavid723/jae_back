// src/controllers/authController.js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import prisma from "../prisma.js";
import { sendPasswordResetEmail } from "../utils/mailer.js";

const TOKEN_TTL_MINUTES = 15;

export const register = async (req, res) => {
  try {
    const { first_name, last_name, email, password, roleName } = req.body;
    if (!email || !password || !first_name || !last_name) {
      return res.status(400).json({ message: "Faltan campos requeridos" });
    }

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return res.status(400).json({ message: "Email ya registrado" });

    const hashed = await bcrypt.hash(password, 10);
    // buscar role por nombre si viene
    let role = null;
    if (roleName) role = await prisma.role.findUnique({ where: { name: roleName } });

    const user = await prisma.user.create({
      data: {
        first_name,
        last_name,
        email,
        password: hashed,
        role_id: role ? role.id : undefined,
      },
    });

    // opcional crear student/teacher entries según rol
    if (role && role.name === "estudiante") {
      await prisma.student.create({ data: { user_id: user.id } }).catch(()=>{});
    }
    if (role && role.name === "docente") {
      await prisma.teacher.create({ data: { user_id: user.id } }).catch(()=>{});
    }

    return res.json({ message: "Usuario creado", user: { id: user.id, email: user.email } });
  } catch (error) {
    console.error("register error:", error);
    return res.status(500).json({ message: "Error al registrar usuario" });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Faltan credenciales" });

    const user = await prisma.user.findUnique({ where: { email }, include: { role: true } });
    if (!user) return res.status(401).json({ message: "Usuario o contraseña inválidos" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: "Usuario o contraseña inválidos" });

    const token = jwt.sign({ userId: user.id, role: user.role?.name }, process.env.JWT_SECRET, { expiresIn: "8h" });
    return res.json({ message: "Login exitoso", token, user: { id: user.id, email: user.email, role: user.role?.name, first_name:user.first_name, last_name:user.last_name } });
  } catch (error) {
    console.error("login error:", error);
    return res.status(500).json({ message: "Error en login" });
  }
};

// forgot password
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email requerido" });

    const user = await prisma.user.findUnique({ where: { email } });

    // Respuesta genérica para evitar enumeración de cuentas
    const genericMessage = "Si existe una cuenta con ese correo, recibirás un email con instrucciones.";

    if (!user) {
      return res.json({ message: genericMessage });
    }

    // eliminar tokens previos
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

    // generar token (string no-hasheado para enviar)
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000);

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    // armar link (frontend recibirá ?token=... optionally &email=...)
    const resetLink = `${process.env.FRONTEND_URL}?token=${token}&email=${encodeURIComponent(user.email)}`;

    const { previewUrl } = await sendPasswordResetEmail(user.email, resetLink);

    // para desarrollo muestra previewUrl si existe
    const response = { message: genericMessage };
    if (previewUrl) response.previewUrl = previewUrl;

    return res.json(response);
  } catch (error) {
    console.error("forgotPassword error:", error);
    return res.status(500).json({ message: "Error al procesar la solicitud" });
  }
};

// reset password
export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ message: "Token y nueva contraseña son requeridos" });

    // opcional: validar fortaleza de newPassword aquí (min length, etc.)
    if (newPassword.length < 6) return res.status(400).json({ message: "Contraseña muy corta (min 6 caracteres)" });

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!record) return res.status(400).json({ message: "Token inválido o ya usado" });

    if (record.expiresAt < new Date()) {
      await prisma.passwordResetToken.deleteMany({ where: { userId: record.userId } });
      return res.status(400).json({ message: "Token expirado" });
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: record.userId },
      data: { password: hashed },
    });

    // eliminar tokens del usuario
    await prisma.passwordResetToken.deleteMany({ where: { userId: record.userId } });

    return res.json({ message: "Contraseña actualizada correctamente" });
  } catch (error) {
    console.error("resetPassword error:", error);
    return res.status(500).json({ message: "Error al restablecer contraseña" });
  }
};
