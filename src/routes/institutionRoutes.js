import express from 'express';
import {
    createInstitution,
    getInstitutions,
    getInstitutionById,
    updateInstitution,
    deleteInstitution,
} from '../controllers/institutionController.js';

// Usamos el mismo middleware de autenticación que tienes
import authMiddleware from '../middlewares/auth.js'; 

const router = express.Router();

// Rutas para listar y crear instituciones
router.route('/')
    .get(authMiddleware, getInstitutions)
    .post(authMiddleware, createInstitution);

// Rutas para leer, actualizar y eliminar por ID
router.route('/:id')
    .get(authMiddleware, getInstitutionById)
    .put(authMiddleware, updateInstitution)
    .delete(authMiddleware, deleteInstitution);

export default router;