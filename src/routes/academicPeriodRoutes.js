import express from 'express';
// Importamos el controlador con las funciones CRUD
import { getAllPeriods, createPeriod, updatePeriod, deletePeriod } from '../controllers/academicPeriodController.js';
// Importamos los middlewares de autenticación y autorización
import authMiddleware, { authorizeRole } from '../middlewares/auth.js'; 

const router = express.Router();

// 🔒 Middleware de autenticación y autorización para este módulo.
// Se usa un array para aplicar authMiddleware primero, y luego verificar el rol 'admin'.
const adminAccess = [authMiddleware, authorizeRole('admin')];


router.route('/')
    // GET /api/academic-periods: Lista todos los períodos de la IE asignada
    .get(adminAccess, getAllPeriods) 
    // POST /api/academic-periods: Crea un nuevo período
    .post(adminAccess, createPeriod);

router.route('/:id')
    // PUT /api/academic-periods/:id: Actualiza un período específico
    .put(adminAccess, updatePeriod)
    // DELETE /api/academic-periods/:id: Elimina un período específico
    .delete(adminAccess, deletePeriod);

export default router;