import express from "express";
import {
  register,
  login,
  forgotPassword,
  resetPassword,
  getAllUsers,
  deleteUser,
  updateUser,
} from "../controllers/authController.js";
import authMiddleware from "../middlewares/auth.js";
import isSuperAdmin from "../middlewares/isSuperAdmin.js";

const router = express.Router();

// Solo administradores pueden registrar usuarios
router.post("/register", authMiddleware, isSuperAdmin, register);

// 🔹 Listar todos los usuarios (solo para administradores)
router.get("/users", authMiddleware, isSuperAdmin, getAllUsers);

// 🔹 Editar usuario por id (solo para administradores)
router.put("/users/:id", authMiddleware, isSuperAdmin, updateUser);

// 🔹 Eliminar usuario por id (solo para administradores)
router.delete("/users/:id", authMiddleware, isSuperAdmin, deleteUser);

// Login y recuperación de contraseña (sin restricción de rol)
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;
