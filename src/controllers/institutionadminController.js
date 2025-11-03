import { PrismaClient } from '@prisma/client';

// Inicialización de Prisma Client
const prisma = new PrismaClient();

/**
 * @route GET /api/institution-admins
 * @desc Obtiene todos los administradores que están asignados a una institución.
 * Incluye datos completos del usuario y la institución.
 */
export const listAssignedAdmins = async (req, res) => {
    try {
        // 1. Obtener todas las asignaciones de InstitutionAdmin.
        const assignedAdmins = await prisma.institutionAdmin.findMany({
            orderBy: { assigned_at: 'asc' }, // Ordenar por fecha de asignación
            include: {
                user: {
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                        email: true,
                        // Incluye el rol del usuario
                        role: { 
                            select: { name: true } 
                        }, 
                    }
                },
                institution: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                        address: true,
                        status: true // Para el filtro de activas
                    }
                }
            }
        });

        // 2. Mapear el resultado para adaptarlo al frontend (extrayendo el nombre del rol).
        const formattedAdmins = assignedAdmins.map(admin => ({
            ...admin,
            user: {
                ...admin.user,
                // Extraer el nombre del rol directamente
                role: admin.user.role?.name || 'sin_rol',
            }
        }));

        return res.status(200).json({
            message: "Administradores asignados listados con éxito.",
            data: formattedAdmins
        });

    } catch (error) {
        console.error("Error al listar administradores de institución:", error);
        return res.status(500).json({ message: "Error interno del servidor al obtener administradores asignados." });
    }
};


/**
 * @route GET /api/users/unassigned-admins
 * @desc Obtiene todos los usuarios con rol 'admin' que NO tienen una institución asignada.
 */
export const listUnassignedAdmins = async (req, res) => {
    try {
        // 1. Busca usuarios con rol 'admin' que NO tienen una relación en InstitutionAdmin
        const unassignedAdmins = await prisma.user.findMany({
            where: {
                // Filtrar por usuarios que tienen el rol 'admin'
                role: { name: 'admin' }, 
                // Filtrar por usuarios que NO tienen registros en la tabla InstitutionAdmin
                institutionAdmins: { none: {} } 
            },
            select: {
                id: true,
                first_name: true,
                last_name: true,
                email: true,
                role: { select: { name: true } }
            },
            orderBy: { last_name: 'asc' }
        });

        // 2. Mapear el resultado para adaptarlo al frontend
        const formattedAdmins = unassignedAdmins.map(u => ({ 
            id: u.id,
            first_name: u.first_name,
            last_name: u.last_name,
            email: u.email,
            role: u.role?.name || 'sin_rol' 
        }));

        return res.status(200).json({
            message: "Administradores sin institución listados con éxito.",
            data: formattedAdmins
        });
    } catch (error) {
        console.error("Error al listar administradores sin institución:", error);
        return res.status(500).json({ message: "Error interno del servidor al obtener administradores sin asignar." });
    }
};


/**
 * @route POST /api/institution-admins/assign
 * @desc Asigna un usuario (Admin) a una institución.
 * @body { user_id: number, institution_id: number }
 */
export const assignInstitutionAdmin = async (req, res) => {
    const { user_id, institution_id } = req.body;

    // Convertimos a número si vienen como string desde el body (aunque Prisma lo manejaría)
    const userIdNum = parseInt(user_id);
    const institutionIdNum = parseInt(institution_id);

    if (isNaN(userIdNum) || isNaN(institutionIdNum)) {
        return res.status(400).json({ message: "Se requieren 'user_id' e 'institution_id' válidos." });
    }

    try {
        // 1. Verificar si el usuario ya está asignado a CUALQUIER institución.
        const existingAssignment = await prisma.institutionAdmin.findFirst({
            where: { user_id: userIdNum }
        });

        if (existingAssignment) {
            return res.status(400).json({ message: "Este administrador ya tiene una institución asignada." });
        }
        
        // 2. Verificar que el usuario tenga realmente el rol 'admin'.
        const user = await prisma.user.findUnique({
            where: { id: userIdNum },
            include: { role: true }
        });
        
        if (!user || user.role?.name !== 'admin') {
             return res.status(400).json({ message: "El usuario debe tener el rol 'admin' para ser asignado." });
        }
        
        // 3. Crear la nueva asignación.
        const newAssignment = await prisma.institutionAdmin.create({
            data: { 
                user_id: userIdNum, 
                institution_id: institutionIdNum
            },
            // Incluimos la data relevante para la respuesta
            include: {
                user: { select: { id: true, first_name: true, last_name: true, email: true } },
                institution: { select: { name: true, code: true } }
            }
        });

        return res.status(201).json({
            message: "Institución asignada al administrador con éxito.",
            data: newAssignment
        });

    } catch (error) {
        // Manejo de errores específicos de Prisma, como clave foránea no existente.
        if (error.code === 'P2003') { 
            return res.status(404).json({ message: "El ID de usuario o institución proporcionado no existe." });
        }
        console.error("Error al asignar administrador de institución:", error);
        return res.status(500).json({ message: "Error interno del servidor al realizar la asignación." });
    }
};


/**
 * @route DELETE /api/institution-admins/unassign/:institutionAdminId
 * @desc Elimina la asignación de un usuario (Admin) a una institución.
 * @param { number } institutionAdminId - ID del registro en la tabla pivote InstitutionAdmin.
 */
export const unassignInstitutionAdmin = async (req, res) => {
    const { institutionAdminId } = req.params;
    const assignmentId = parseInt(institutionAdminId);

    if (isNaN(assignmentId)) {
        return res.status(400).json({ message: "Se requiere un ID de asignación válido." });
    }

    try {
        // Eliminar el registro de la tabla InstitutionAdmin
        const deletedAssignment = await prisma.institutionAdmin.delete({
            where: { id: assignmentId }
        });

        return res.status(200).json({
            message: "Asignación eliminada con éxito. El administrador ya no está asociado a la institución.",
            data: deletedAssignment
        });

    } catch (error) {
        // P2025: Si el registro no existe (InstitutionAdmin no encontrado)
        if (error.code === 'P2025') {
            return res.status(404).json({ message: "La asignación a eliminar no fue encontrada.", code: 'P2025' });
        }
        
        console.error("Error al desasignar administrador de institución:", error);
        return res.status(500).json({ message: "Error interno del servidor al desasignar." });
    }
};