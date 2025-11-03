import express from "express";
import {
    createCourse,
    getCourses,
    getCourseById,
    updateCourse,
    deleteCourse,
    getListSimpleCourses // 👈 1. IMPORTAR LA FUNCIÓN FALTANTE
} from "../controllers/courseController.js";

// Importamos ambos middlewares
import authMiddleware, { authorizeRole } from "../middlewares/auth.js";

const router = express.Router();

// ==================================================
// Rutas de Cursos (Asignaturas)
// --------------------------------------------------
// (Asumimos que solo el 'admin' gestiona el catálogo de cursos)
const adminAccess = [authMiddleware, authorizeRole('admin')];
// ==================================================


// 💡 CORRECCIÓN DE ORDEN:
// Las rutas estáticas (list-simple) DEBEN ir ANTES que las dinámicas (/:id)

// GET: Obtener lista ligera para modales (NUEVA)
router.get("/list-simple", adminAccess, getListSimpleCourses);

// GET: Obtener todos los cursos (Para la tabla principal)
router.get("/", adminAccess, getCourses); 

// GET: Obtener un curso por ID (Ahora sí, al final)
router.get("/:id", adminAccess, getCourseById);

// POST: Crear un nuevo curso
router.post("/", adminAccess, createCourse);

// PUT: Actualizar un curso por ID
router.put("/:id", adminAccess, updateCourse);

// DELETE: Eliminar un curso por ID
router.delete("/:id", adminAccess, deleteCourse);

export default router;

