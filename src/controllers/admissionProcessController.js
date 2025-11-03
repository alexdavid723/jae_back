import prisma from "../prisma.js";

// ==========================================================
// UTILITY: Obtener Institution ID del usuario logueado
// ==========================================================
const getAdminInstitutionId = async (req) => {
    const userId = req.user?.id; 
    if (!userId) return null;

    const adminAssignment = await prisma.institutionAdmin.findFirst({
        where: { user_id: userId },
        select: { institution_id: true }
    });
    return adminAssignment?.institution_id || null;
};

// ==========================================================
// 🎯 LISTAR TODOS LOS PROCESOS (READ)
// ==========================================================
export const getAllAdmissionProcesses = async (req, res) => {
    try {
        const institutionId = await getAdminInstitutionId(req);
        if (!institutionId) {
            return res.status(403).json({ message: "No tienes una institución asignada." });
        }

        const processes = await prisma.admissionProcess.findMany({
            where: {
                academicPeriod: {
                    institution_id: institutionId
                }
            },
            include: {
                academicPeriod: { select: { name: true, id: true } }, // 💡 Incluir ID de periodo
                _count: { 
                    select: { enrollments: true } 
                }
            },
            orderBy: {
                start_date: 'desc'
            }
        });

        return res.status(200).json(processes);

    } catch (error) {
        console.error("Error al listar procesos de admisión:", error);
        return res.status(500).json({ message: "Error interno al obtener procesos." });
    }
};

// ==========================================================
// 🎯 CREAR NUEVO PROCESO (CREATE)
// ==========================================================
export const createAdmissionProcess = async (req, res) => {
    const { academic_period_id, description, start_date, end_date } = req.body;

    try {
        const institutionId = await getAdminInstitutionId(req);
        if (!institutionId) {
            return res.status(403).json({ message: "No tienes una institución asignada." });
        }

        if (!academic_period_id || !start_date || !end_date) {
            return res.status(400).json({ message: "El periodo académico y las fechas son obligatorios." });
        }

        const period = await prisma.academicPeriod.findFirst({
            where: { id: Number(academic_period_id), institution_id: institutionId }
        });
        if (!period) {
            return res.status(403).json({ message: "Datos inválidos: El periodo académico no pertenece a esta institución." });
        }
        
        const existingProcess = await prisma.admissionProcess.findFirst({
             where: { academic_period_id: Number(academic_period_id) }
        });
        if (existingProcess) {
             return res.status(400).json({ message: "Ya existe un proceso de admisión definido para ese periodo académico." });
        }

        const newProcess = await prisma.admissionProcess.create({
            data: {
                academic_period_id: Number(academic_period_id),
                description: description || `Proceso de Admisión ${period.name}`,
                start_date: new Date(start_date),
                end_date: new Date(end_date),
            }
        });

        return res.status(201).json(newProcess);

    } catch (error) {
        console.error("Error al crear proceso de admisión:", error);
        if (error.code === 'P2002') {
            return res.status(400).json({ message: "Error: Ya existe un proceso de admisión para este periodo académico." });
        }
        return res.status(500).json({ message: "Error interno al crear el proceso." });
    }
};

// ==========================================================
// 🎯 ACTUALIZAR PROCESO (UPDATE)
// ==========================================================
export const updateAdmissionProcess = async (req, res) => {
    const { id } = req.params;
    const { academic_period_id, description, start_date, end_date } = req.body;

    try {
        const institutionId = await getAdminInstitutionId(req);
        if (!institutionId) return res.status(403).json({ message: "Institución no asignada." });

        const existingProcess = await prisma.admissionProcess.findFirst({
            where: {
                id: Number(id),
                academicPeriod: { institution_id: institutionId }
            }
        });

        if (!existingProcess) {
            return res.status(404).json({ message: "Proceso no encontrado o no pertenece a tu institución." });
        }
        
        const updatedProcess = await prisma.admissionProcess.update({
            where: { id: Number(id) },
            data: {
                academic_period_id: Number(academic_period_id),
                description,
                start_date: new Date(start_date),
                end_date: new Date(end_date),
            },
        });

        return res.status(200).json(updatedProcess);

    } catch (error) {
        console.error("Error al actualizar proceso:", error);
        return res.status(500).json({ message: "Error interno al actualizar el proceso." });
    }
};

// ==========================================================
// 🎯 ELIMINAR PROCESO (DELETE)
// ==========================================================
export const deleteAdmissionProcess = async (req, res) => {
    const { id } = req.params;

    try {
        const institutionId = await getAdminInstitutionId(req);
        if (!institutionId) return res.status(403).json({ message: "Institución no asignada." });

        const existingProcess = await prisma.admissionProcess.findFirst({
            where: {
                id: Number(id),
                academicPeriod: { institution_id: institutionId }
            }
        });
        if (!existingProcess) {
            return res.status(404).json({ message: "Proceso no encontrado." });
        }
        
        const enrollmentsCount = await prisma.enrollment.count({
            where: { admission_process_id: Number(id) }
        });
        
        if (enrollmentsCount > 0) {
            return res.status(400).json({ message: "No se puede eliminar: Este proceso ya tiene matrículas (enrollments) asociadas." });
        }
        
        await prisma.admissionProcess.delete({ where: { id: Number(id) } });

        return res.status(200).json({ message: "Proceso de admisión eliminado con éxito." });

    } catch (error) {
        console.error("Error al eliminar proceso:", error);
        if (error.code === 'P2003') {
            return res.status(400).json({ message: "No se puede eliminar: Aún existen dependencias (ej. matrículas)." });
        }
        return res.status(500).json({ message: "Error interno al eliminar el proceso." });
    }
};

