import { Router } from 'express';
import {
    getAllAdmissionProcesses,
    createAdmissionProcess,
    updateAdmissionProcess,
    deleteAdmissionProcess
} from '../controllers/admissionProcessController.js';

// Importamos los middlewares de autenticación
import authMiddleware, { authorizeRole } from '../middlewares/auth.js'; 

const router = Router();

// 🔒 Middleware de autorización: Solo el Director (Admin) puede gestionar
const adminAccess = [authMiddleware, authorizeRole('admin')];


// 1. OBTENER TODOS LOS PROCESOS (READ ALL)
// Endpoint: GET /api/admission-processes
router.get('/', adminAccess, getAllAdmissionProcesses);

// 2. CREAR NUEVO PROCESO (CREATE)
// Endpoint: POST /api/admission-processes
router.post('/', adminAccess, createAdmissionProcess);

// 3. ACTUALIZAR UN PROCESO POR ID (UPDATE)
// Endpoint: PUT /api/admission-processes/:id
router.put('/:id', adminAccess, updateAdmissionProcess);

// 4. ELIMINAR UN PROCESO POR ID (DELETE)
// Endpoint: DELETE /api/admission-processes/:id
router.delete('/:id', adminAccess, deleteAdmissionProcess);

export default router;

