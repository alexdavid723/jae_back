import { Router } from 'express';
import {
    getAllEnrollments,
    getEnrollmentById,
    createEnrollment,
    updateEnrollment,
    deleteEnrollment,
    // 💡 NUEVAS IMPORTACIONES
    getEnrolledCourses,
    getAvailableCourses,
    enrollStudentInCourse,
    removeStudentFromCourse,
    getFullEnrollmentRoster // 👈 1. IMPORTAR LA NUEVA RUTA
} from '../controllers/enrollmentController.js';

// Importamos los middlewares de autenticación
import authMiddleware, { authorizeRole } from '../middlewares/auth.js'; 

const router = Router();

// 🔒 Middleware de autorización: Solo el Director (Admin) puede gestionar
const adminAccess = [authMiddleware, authorizeRole('admin')];


// ==================================================
// 🎯 RUTAS ESTÁTICAS (Deben ir primero)
// ==================================================

// GET: Obtener todas las matrículas (READ ALL)
router.get('/', adminAccess, getAllEnrollments);

// POST: Crear nueva matrícula (CREATE)
router.post('/', adminAccess, createEnrollment);

// POST: Inscribe al estudiante en un curso (Crea 'Grade' y 'EnrollmentCourse')
router.post('/register-course', adminAccess, enrollStudentInCourse);

// 💡 2. AÑADIR RUTA PARA EL REPORTE
// GET: Obtiene la nómina completa para CSV/Excel
router.get('/full-roster', adminAccess, getFullEnrollmentRoster);


// ==================================================
// 💡 RUTAS DINÁMICAS (Deben ir después)
// ==================================================

// GET: Obtiene los cursos en los que un estudiante YA está inscrito
// /api/enrollments/:studentId/registered-courses?periodId=X
router.get('/:studentId/registered-courses', adminAccess, getEnrolledCourses);

// GET: Obtiene los cursos (Assignments) disponibles para inscribir
// /api/enrollments/:studentId/available-courses?periodId=X
router.get('/:studentId/available-courses', adminAccess, getAvailableCourses);

// DELETE: Anula la inscripción (Elimina 'Grade' y 'EnrollmentCourse')
// /api/enrollments/remove-course/:grade_id
router.delete('/remove-course/:grade_id', adminAccess, removeStudentFromCourse);

// GET: Obtener una matrícula por ID (READ SINGLE)
// (Debe ir al final de las rutas GET dinámicas)
router.get('/:id', adminAccess, getEnrollmentById);

// PUT: Actualizar una matrícula por ID (UPDATE)
router.put('/:id', adminAccess, updateEnrollment);

// DELETE: Eliminar una matrícula por ID (DELETE)
router.delete('/:id', adminAccess, deleteEnrollment);


export default router;

