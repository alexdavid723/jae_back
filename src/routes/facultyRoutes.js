import { Router } from 'express';
import {
    getAllFaculties,
    createFaculty,
    updateFaculty,
    deleteFaculty
} from '../controllers/facultyController.js';

// 🚨 CORRECCIÓN DEL PATH: Aseguramos que apunte al plural 'middlewares'
import authMiddleware, { authorizeRole } from '../middlewares/auth.js'; 

const router = Router();

// 🔒 Middleware de autorización para el rol 'admin' (Director de IE).
const adminAccess = [authMiddleware, authorizeRole('admin')];


router.route('/')
    // GET /api/faculties: Lista áreas/facultades de la IE asignada
    .get(adminAccess, getAllFaculties) 
    // POST /api/faculties: Crea una nueva área/facultad
    .post(adminAccess, createFaculty);

router.route('/:id')
    // PUT /api/faculties/:id: Actualiza un área/facultad
    .put(adminAccess, updateFaculty)
    // DELETE /api/faculties/:id: Elimina un área/facultad
    .delete(adminAccess, deleteFaculty);

export default router;