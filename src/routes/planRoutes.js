import { Router } from 'express';
import {
    getAllPlans,
    createPlan,
    updatePlan,
    deletePlan
} from '../controllers/planController.js';

// 🚨 CORRECCIÓN DEL PATH: Cambiamos '../middleware/auth.js' a '../middlewares/auth.js'
// 🚨 CORRECCIÓN DE EXPORTACIÓN: Usamos 'authorizeRole' que definimos en auth.js
import authMiddleware, { authorizeRole } from '../middlewares/auth.js'; 

const router = Router();

// 🔒 Middleware de autorización para el rol 'admin' (Director de IE).
const adminAccess = [authMiddleware, authorizeRole('admin')];


// 1. OBTENER TODOS LOS PLANES (READ ALL)
// Endpoint: GET /api/plans
router.get('/', adminAccess, getAllPlans);

// 2. CREAR NUEVO PLAN (CREATE)
// Endpoint: POST /api/plans
router.post('/', adminAccess, createPlan);

// 3. ACTUALIZAR UN PLAN POR ID (UPDATE)
// Endpoint: PUT /api/plans/:id
router.put('/:id', adminAccess, updatePlan);

// 4. ELIMINAR UN PLAN POR ID (DELETE)
// Endpoint: DELETE /api/plans/:id
router.delete('/:id', adminAccess, deletePlan);

export default router;