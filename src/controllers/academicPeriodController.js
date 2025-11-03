import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ==========================================================
// UTILITY: Obtener Institution ID del usuario logueado
// ==========================================================
/**
 * @description Función auxiliar para obtener el institution_id del usuario Admin.
 * @param {object} req - Objeto de solicitud de Express.
 * @returns {number | null} El ID de la institución o null si no se encuentra.
 */
const getAdminInstitutionId = async (req) => {
    // 1. Obtener el ID del usuario desde el token (adjunto por authMiddleware)
    const userId = req.user?.id;
    
    if (!userId) return null;

    // 2. Buscar la asignación de la IE
    const adminAssignment = await prisma.institutionAdmin.findFirst({
        where: { user_id: userId },
        select: { institution_id: true }
    });

    return adminAssignment?.institution_id || null;
};


// ==========================================================
// 🎯 LISTAR TODOS LOS PERÍODOS (READ)
// ==========================================================

/**
 * @route GET /api/academic-periods
 * @desc Obtiene todos los períodos académicos de la IE asignada al Admin.
 */
export const getAllPeriods = async (req, res) => {
    try {
        const institutionId = await getAdminInstitutionId(req);

        if (!institutionId) {
            return res.status(403).json({ message: "No tienes una institución asignada para consultar períodos." });
        }

        // Consulta filtrada por la institución del admin
        const periods = await prisma.academicPeriod.findMany({
            where: { institution_id: institutionId },
            orderBy: [{ year: 'desc' }, { start_date: 'desc' }]
        });

        return res.status(200).json(periods);

    } catch (error) {
        console.error("Error al listar períodos académicos:", error);
        return res.status(500).json({ message: "Error interno al obtener los períodos académicos." });
    }
};

// ==========================================================
// 🎯 CREAR NUEVO PERÍODO (CREATE)
// ==========================================================

/**
 * @route POST /api/academic-periods
 * @desc Crea un nuevo período académico para la IE asignada.
 * @body { year, name, modality, start_date, end_date, is_active }
 */
export const createPeriod = async (req, res) => {
    const { year, name, modality, start_date, end_date, is_active } = req.body;

    try {
        const institutionId = await getAdminInstitutionId(req);

        if (!institutionId) {
            return res.status(403).json({ message: "Institución no asignada." });
        }

        // Conversión de fechas a formato Date de JavaScript
        const startDate = new Date(start_date);
        const endDate = new Date(end_date);
        
        if (endDate <= startDate) {
             return res.status(400).json({ message: "La fecha de fin debe ser posterior a la fecha de inicio." });
        }

        // Verificar unicidad (Prisma se encargará, pero es mejor dar un mensaje claro)
        const exists = await prisma.academicPeriod.findFirst({
            where: { institution_id: institutionId, year: Number(year), name },
        });

        if (exists) {
            return res.status(400).json({ message: "Ya existe un período con ese nombre y año en esta institución." });
        }
        
        // Si se marca como activo, desactivar los demás períodos activos (para mantener un único período activo)
        if (is_active) {
            await prisma.academicPeriod.updateMany({
                where: { institution_id: institutionId, is_active: true },
                data: { is_active: false },
            });
        }

        const newPeriod = await prisma.academicPeriod.create({
            data: {
                institution_id: institutionId,
                year: Number(year),
                name,
                modality,
                start_date: startDate,
                end_date: endDate,
                is_active: is_active ?? true, // Por defecto, activo
            },
        });

        return res.status(201).json(newPeriod);

    } catch (error) {
        console.error("Error al crear período:", error);
        return res.status(500).json({ message: "Error interno al crear el período académico.", error: error.message });
    }
};

// ==========================================================
// 🎯 ACTUALIZAR PERÍODO (UPDATE)
// ==========================================================

/**
 * @route PUT /api/academic-periods/:id
 * @desc Actualiza un período académico existente.
 */
export const updatePeriod = async (req, res) => {
    const { id } = req.params;
    const { year, name, modality, start_date, end_date, is_active } = req.body;

    try {
        const institutionId = await getAdminInstitutionId(req);
        if (!institutionId) return res.status(403).json({ message: "Institución no asignada." });

        // 1. Verificar que el período pertenece a la IE del admin
        const period = await prisma.academicPeriod.findUnique({ where: { id: Number(id) } });

        if (!period || period.institution_id !== institutionId) {
            return res.status(404).json({ message: "Período no encontrado o no pertenece a tu institución." });
        }

        // 2. Desactivar otros períodos si este se marca como activo
        if (is_active === true) {
            await prisma.academicPeriod.updateMany({
                where: { 
                    institution_id: institutionId, 
                    is_active: true,
                    id: { not: Number(id) } // No desactivar el actual
                },
                data: { is_active: false },
            });
        }
        
        const updatedPeriod = await prisma.academicPeriod.update({
            where: { id: Number(id) },
            data: {
                year: Number(year),
                name,
                modality,
                start_date: start_date ? new Date(start_date) : undefined,
                end_date: end_date ? new Date(end_date) : undefined,
                is_active,
            },
        });

        return res.status(200).json(updatedPeriod);

    } catch (error) {
        console.error("Error al actualizar período:", error);
        return res.status(500).json({ message: "Error interno al actualizar el período.", error: error.message });
    }
};

// ==========================================================
// 🎯 ELIMINAR PERÍODO (DELETE)
// ==========================================================

/**
 * @route DELETE /api/academic-periods/:id
 * @desc Elimina un período académico.
 */
export const deletePeriod = async (req, res) => {
    const { id } = req.params;

    try {
        const institutionId = await getAdminInstitutionId(req);
        if (!institutionId) return res.status(403).json({ message: "Institución no asignada." });

        // 1. Verificar que el período pertenece a la IE del admin
        const period = await prisma.academicPeriod.findUnique({ where: { id: Number(id) } });

        if (!period || period.institution_id !== institutionId) {
            return res.status(404).json({ message: "Período no encontrado o no pertenece a tu institución." });
        }
        
        // 2. Verificar dependencias (opcional, pero crucial)
        // Puedes añadir una verificación aquí para asegurar que no haya AdmissionProcess o EnrollmentSheet
        // asociados al período antes de permitir la eliminación.

        await prisma.academicPeriod.delete({ where: { id: Number(id) } });

        return res.status(200).json({ message: "Período eliminado con éxito." });

    } catch (error) {
        // Manejo de error de clave foránea (P2003) si hay registros dependientes
        if (error.code === 'P2003') {
            return res.status(400).json({ message: "No se puede eliminar el período: tiene matrículas o asignaciones asociadas." });
        }
        console.error("Error al eliminar período:", error);
        return res.status(500).json({ message: "Error interno al eliminar el período." });
    }
};
