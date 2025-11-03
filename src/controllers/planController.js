import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ==========================================================
// UTILITY: Obtener Institution ID del usuario logueado
// ==========================================================
/**
 * @description Función auxiliar para obtener el institution_id del usuario Admin.
 * @param {object} req - Objeto de solicitud de Express (asume req.user está adjunto).
 * @returns {Promise<number | null>} El ID de la institución.
 */
const getAdminInstitutionId = async (req) => {
    // Obtenemos el ID del usuario desde el token (adjunto por authMiddleware)
    const userId = req.user?.id; 
    
    if (!userId) return null;

    // Buscar la asignación de la IE
    const adminAssignment = await prisma.institutionAdmin.findFirst({
        where: { user_id: userId },
        select: { institution_id: true }
    });

    return adminAssignment?.institution_id || null;
};


// ==========================================================
// 🎯 LISTAR TODOS LOS PLANES (READ)
// ==========================================================

/**
 * @route GET /api/plans
 * @desc Obtiene todos los Planes de Estudio de la IE asignada al Admin.
 */
export const getAllPlans = async (req, res) => {
    try {
        const institutionId = await getAdminInstitutionId(req);

        if (!institutionId) {
            return res.status(403).json({ message: "No tienes una institución asignada para consultar planes." });
        }

        // Consulta filtrada por la institución del admin
        const plans = await prisma.plan.findMany({
            where: { institution_id: institutionId },
            orderBy: [{ start_year: 'desc' }, { title: 'asc' }]
        });

        return res.status(200).json(plans);

    } catch (error) {
        console.error("Error al listar planes de estudio:", error);
        return res.status(500).json({ message: "Error interno al obtener los planes de estudio." });
    }
};

// ==========================================================
// 🎯 CREAR NUEVO PLAN (CREATE)
// ==========================================================

/**
 * @route POST /api/plans
 * @desc Crea un nuevo Plan de Estudio para la IE asignada.
 * @body { title, description, start_year, end_year, status }
 */
export const createPlan = async (req, res) => {
    const { title, description, start_year, end_year, status } = req.body;

    try {
        const institutionId = await getAdminInstitutionId(req);

        if (!institutionId) {
            return res.status(403).json({ message: "Institución no asignada." });
        }

        // Validación de Años
        if (Number(start_year) > Number(end_year)) {
            return res.status(400).json({ message: "El año de inicio no puede ser posterior al año de fin." });
        }
        
        // Si se marca como activo/vigente, desactivar los demás planes vigentes (para mantener un único plan activo)
        if (status === true) {
            await prisma.plan.updateMany({
                where: { institution_id: institutionId, status: true },
                data: { status: false },
            });
        }

        const newPlan = await prisma.plan.create({
            data: {
                institution_id: institutionId,
                title,
                description,
                start_year: Number(start_year),
                end_year: Number(end_year),
                status: status ?? true,
            },
        });

        return res.status(201).json(newPlan);

    } catch (error) {
        console.error("Error al crear plan de estudio:", error);
        // P2002: Error de unicidad (si agregaste @@unique([institution_id, title]) a Plan)
        if (error.code === 'P2002') {
             return res.status(400).json({ message: "Ya existe un plan de estudio con el mismo título en tu institución." });
        }
        return res.status(500).json({ message: "Error interno al crear el plan de estudio.", error: error.message });
    }
};

// ==========================================================
// 🎯 ACTUALIZAR PLAN (UPDATE)
// ==========================================================

/**
 * @route PUT /api/plans/:id
 * @desc Actualiza un Plan de Estudio existente.
 */
export const updatePlan = async (req, res) => {
    const { id } = req.params;
    const { title, description, start_year, end_year, status } = req.body;

    try {
        const institutionId = await getAdminInstitutionId(req);
        if (!institutionId) return res.status(403).json({ message: "Institución no asignada." });

        // 1. Verificar que el plan pertenece a la IE del admin
        const plan = await prisma.plan.findUnique({ where: { id: Number(id) } });

        if (!plan || plan.institution_id !== institutionId) {
            return res.status(404).json({ message: "Plan no encontrado o no pertenece a tu institución." });
        }
        
        // 2. Desactivar otros planes si este se marca como activo/vigente
        if (status === true) {
            await prisma.plan.updateMany({
                where: { 
                    institution_id: institutionId, 
                    status: true,
                    id: { not: Number(id) } // No desactivar el actual
                },
                data: { status: false },
            });
        }
        
        const updatedPlan = await prisma.plan.update({
            where: { id: Number(id) },
            data: {
                title,
                description,
                start_year: Number(start_year),
                end_year: Number(end_year),
                status,
            },
        });

        return res.status(200).json(updatedPlan);

    } catch (error) {
        console.error("Error al actualizar plan de estudio:", error);
        return res.status(500).json({ message: "Error interno al actualizar el plan.", error: error.message });
    }
};

// ==========================================================
// 🎯 ELIMINAR PLAN (DELETE)
// ==========================================================

/**
 * @route DELETE /api/plans/:id
 * @desc Elimina un Plan de Estudio.
 */
export const deletePlan = async (req, res) => {
    const { id } = req.params;

    try {
        const institutionId = await getAdminInstitutionId(req);
        if (!institutionId) return res.status(403).json({ message: "Institución no asignada." });

        // 1. Verificar que el plan pertenece a la IE del admin
        const plan = await prisma.plan.findUnique({ where: { id: Number(id) } });

        if (!plan || plan.institution_id !== institutionId) {
            return res.status(404).json({ message: "Plan no encontrado o no pertenece a tu institución." });
        }
        
        // 2. Verificar dependencias (CRUCIAL: Plan está relacionado con Program)
        const programsCount = await prisma.program.count({
            where: { plan_id: Number(id) }
        });
        
        if (programsCount > 0) {
            return res.status(400).json({ message: "No se puede eliminar el plan: tiene programas curriculares asociados." });
        }
        
        await prisma.plan.delete({ where: { id: Number(id) } });

        return res.status(200).json({ message: "Plan de estudio eliminado con éxito." });

    } catch (error) {
        // P2003: Error de clave foránea (aunque ya lo verificamos, es un fallback)
        if (error.code === 'P2003') {
             return res.status(400).json({ message: "No se puede eliminar el plan: existen dependencias activas." });
        }
        console.error("Error al eliminar plan:", error);
        return res.status(500).json({ message: "Error interno al eliminar el plan." });
    }
};
