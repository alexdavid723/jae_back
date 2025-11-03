import express from 'express';
// Importamos el middleware de autenticación que ya usas
import authMiddleware from '../middlewares/auth.js'; 
import { 
    listAssignedAdmins, 
    assignInstitutionAdmin,
    listUnassignedAdmins,
    // 🚀 Importamos la nueva función para eliminar la relación
    unassignInstitutionAdmin 
} from '../controllers/institutionAdminController.js'; 

const router = express.Router();

// --- Rutas de Gestión de Administradores de Institución ---

// 1. GET /api/institution-admins
// RUTA PROTEGIDA: Lista todos los administradores asignados.
router.route('/')
    .get(authMiddleware, listAssignedAdmins);

// 2. POST /api/institution-admins/assign
// RUTA PROTEGIDA: Asigna un administrador a una institución.
router.route('/assign')
    .post(authMiddleware, assignInstitutionAdmin);
    
// 3. DELETE /api/institution-admins/unassign/:institutionAdminId
// RUTA PROTEGIDA: Desasigna (elimina la relación) un administrador de una institución.
// El parámetro es el ID del registro en la tabla pivote InstitutionAdmin.
router.route('/unassign/:institutionAdminId')
    .delete(authMiddleware, unassignInstitutionAdmin);

// 4. GET /api/users/unassigned-admins
// RUTA PROTEGIDA: Lista los administradores sin IE asignada.
// NOTA IMPORTANTE: Esta ruta tiene un prefijo de ruta diferente (`/users/`)
// Asegúrate de montarla correctamente en tu aplicación principal, ya sea en un 
// router de usuarios o usando el prefijo completo si montas este router bajo `/api`.
router.route('/users/unassigned-admins')
    .get(authMiddleware, listUnassignedAdmins);


export default router;