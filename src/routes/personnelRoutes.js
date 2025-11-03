import { Router } from 'express';
import {
    getInstitutionalPersonnel,
    getListSimpleTeachers,
    getListSimpleStudents // 👈 Importamos la función para estudiantes
} from '../controllers/personnelController.js';

// Importamos los middlewares de autenticación
import authMiddleware, { authorizeRole } from '../middlewares/auth.js'; 

const router = Router();

// 🔒 Middleware de autorización: Solo el Director (Admin) puede ver el personal
const adminAccess = [authMiddleware, authorizeRole('admin')];


// ==========================================================
// 🎯 RUTAS DE PERSONAL
// ==========================================================

/**
 * @route GET /api/personnel/list-all-institutional
 * @desc (Para la tabla principal) Obtiene la lista completa de Docentes y Estudiantes de la IE.
 */
router.get('/list-all-institutional', adminAccess, getInstitutionalPersonnel);

/**
 * @route GET /api/personnel/teachers-simple
 * @desc (Para modales) Obtiene una lista ligera (id, nombre) solo de Docentes activos.
 */
router.get('/teachers-simple', adminAccess, getListSimpleTeachers);

/**
 * @route GET /api/personnel/students-simple
 * @desc (Para modales) Obtiene una lista ligera (id, nombre) solo de Estudiantes activos.
 */
router.get('/students-simple', adminAccess, getListSimpleStudents);


export default router;

