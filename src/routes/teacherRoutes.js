import { Router } from 'express';
import {
    getMyAssignedClasses,
    getAssignmentDetailsWithGrades,
    updateGrades
} from '../controllers/teacherController.js';

// Importamos los middlewares de autenticación
import authMiddleware, { authorizeRole } from '../middlewares/auth.js'; 

const router = Router();

// 🔒 Middleware de autorización: Solo el rol 'docente' puede acceder
const teacherAccess = [authMiddleware, authorizeRole('docente')];


// 1. OBTENER TODAS LAS CLASES ASIGNADAS (Para la página /teacher/classes)
// Endpoint: GET /api/teacher/my-assignments
router.get('/my-assignments', teacherAccess, getMyAssignedClasses);

// 2. OBTENER DETALLES Y ESTUDIANTES DE UNA CLASE (Para /teacher/evaluations)
// Endpoint: GET /api/teacher/assignments/:id/grades
router.get('/assignments/:id/grades', teacherAccess, getAssignmentDetailsWithGrades);

// 3. ACTUALIZAR NOTAS DE UNA CLASE (Para /teacher/evaluations)
// Endpoint: PUT /api/teacher/update-grades
router.put('/update-grades', teacherAccess, updateGrades);

export default router;

