import { Router } from 'express';
import {
    getAllAssignments,
    createAssignment,
    updateAssignment,
    deleteAssignment
} from '../controllers/assignmentController.js';

// Importamos los middlewares de autenticación
import authMiddleware, { authorizeRole } from '../middlewares/auth.js'; 

const router = Router();

// 🔒 Middleware de autorización: Solo el Director (Admin) puede gestionar asignaciones
const adminAccess = [authMiddleware, authorizeRole('admin')];


// 1. OBTENER TODAS LAS ASIGNACIONES (READ ALL)
// Endpoint: GET /api/assignments
router.get('/', adminAccess, getAllAssignments);

// 2. CREAR NUEVA ASIGNACIÓN (CREATE)
// Endpoint: POST /api/assignments
router.post('/', adminAccess, createAssignment);

// 3. ACTUALIZAR UNA ASIGNACIÓN POR ID (UPDATE)
// Endpoint: PUT /api/assignments/:id
router.put('/:id', adminAccess, updateAssignment);

// 4. ELIMINAR UNA ASIGNACIÓN POR ID (DELETE)
// Endpoint: DELETE /api/assignments/:id
router.delete('/:id', adminAccess, deleteAssignment);

export default router;