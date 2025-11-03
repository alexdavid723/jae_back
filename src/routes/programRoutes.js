import { Router } from 'express';
// 🚨 Importamos el middleware de autenticación y la función de autorización por rol
import authMiddleware, { authorizeRole } from '../middlewares/auth.js'; 
import { 
    getAllPrograms, 
    getProgramById,
    createProgram, 
    updateProgram, 
    deleteProgram 
} from '../controllers/programController.js'; 

const router = Router();

// 🔒 Middleware de autorización: Requiere token válido (authMiddleware) y rol 'admin'
const adminAccess = [authMiddleware, authorizeRole('admin')];

// 1. OBTENER TODOS LOS PROGRAMAS (READ ALL)
// Endpoint: GET /api/programs
router.get('/', adminAccess, getAllPrograms);

router.get('/:id', adminAccess, getProgramById); 
// 2. CREAR NUEVO PROGRAMA (CREATE)
// Endpoint: POST /api/programs
router.post('/', adminAccess, createProgram);

// 3. ACTUALIZAR UN PROGRAMA POR ID (UPDATE)
// Endpoint: PUT /api/programs/:id
router.put('/:id', adminAccess, updateProgram);

// 4. ELIMINAR UN PROGRAMA POR ID (DELETE)
// Endpoint: DELETE /api/programs/:id
router.delete('/:id', adminAccess, deleteProgram);

// ⚠️ Cambiamos a exportación de módulo ES para que el 'import' funcione
export default router; 
