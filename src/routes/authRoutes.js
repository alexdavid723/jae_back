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
// Importamos el middleware principal y la función de autorización por rol
import authMiddleware, { authorizeRole } from "../middlewares/auth.js"; 
// 🚨 NO ES NECESARIO importar isSuperAdmin, ya que lo reemplazamos por authorizeRole

const router = express.Router();

// Define los roles permitidos para las acciones de gestión de personal
// Permite a Superadmin (gestión total) y Admin (gestión institucional)
const personnelAccess = [authMiddleware, authorizeRole(['superadmin', 'admin'])];


// 1. REGISTRAR USUARIOS (Docentes, Estudiantes, Admins)
// Endpoint: POST /api/auth/register
// 💡 Permite que el Admin cree Docentes/Estudiantes (controlado en el controller).
router.post("/register", personnelAccess, register); 

// 2. 🔹 Listar todos los usuarios (solo Superadmin para la ruta genérica)
// Si el Admin necesita ver su personal, crearía un endpoint /api/users/teachers-students
router.get("/users", authMiddleware, authorizeRole(['superadmin']), getAllUsers); 

// 3. 🔹 Editar usuario por id 
router.put("/users/:id", personnelAccess, updateUser);

// 4. 🔹 Eliminar usuario por id 
router.delete("/users/:id", personnelAccess, deleteUser);


// Login y recuperación de contraseña (sin restricción de rol)
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;
