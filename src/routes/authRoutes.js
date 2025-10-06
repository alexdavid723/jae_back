import express from "express";
import { register, login, forgotPassword, resetPassword } from "../controllers/authController.js";
import authMiddleware from "../middlewares/auth.js";
import isSuperAdmin from "../middlewares/isSuperAdmin.js";

const router = express.Router();

// Solo administradores pueden registrar usuarios
router.post("/register", authMiddleware, isSuperAdmin, register);

router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;
