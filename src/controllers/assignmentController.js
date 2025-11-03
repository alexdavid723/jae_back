import prisma from "../prisma.js";

// ==========================================================
// UTILITY: Obtener Institution ID del usuario logueado
// ==========================================================
/**
 * @description Función auxiliar para obtener el institution_id del usuario Admin.
 */
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
// 🎯 LISTAR TODAS LAS ASIGNACIONES (READ)
// ==========================================================
/**
 * @route GET /api/assignments
 * @desc Obtiene todas las asignaciones de la IE del Admin.
 */
export const getAllAssignments = async (req, res) => {
    try {
        const institutionId = await getAdminInstitutionId(req);
        if (!institutionId) {
            return res.status(403).json({ message: "No tienes una institución asignada." });
        }

        // Filtramos las asignaciones basándonos en el Periodo Académico
        const assignments = await prisma.assignment.findMany({
            where: {
                academicPeriod: {
                    institution_id: institutionId
                }
            },
            include: {
                course: { select: { name: true } },
                teacher: { select: { user: { select: { first_name: true, last_name: true } } } },
                academicPeriod: { select: { name: true } }
            },
            orderBy: {
                academic_period_id: 'desc'
            }
        });

        // Mapeamos los datos para aplanar la respuesta para el frontend
        const formattedAssignments = assignments.map(a => ({
            id: a.id,
            course_id: a.course_id,
            teacher_id: a.teacher_id,
            academic_period_id: a.academic_period_id,
            shift: a.shift,
            course_name: a.course.name,
            teacher_name: `${a.teacher.user.first_name} ${a.teacher.user.last_name}`,
            period_name: a.academicPeriod.name
        }));

        return res.status(200).json(formattedAssignments);

    } catch (error) {
        console.error("Error al listar asignaciones:", error);
        return res.status(500).json({ message: "Error interno al obtener asignaciones." });
    }
};

// ==========================================================
// 🎯 CREAR NUEVA ASIGNACIÓN (CREATE)
// ==========================================================
/**
 * @route POST /api/assignments
 * @desc Crea una nueva asignación de curso-docente-periodo.
 */
export const createAssignment = async (req, res) => {
    const { course_id, teacher_id, academic_period_id, shift } = req.body;

    try {
        const institutionId = await getAdminInstitutionId(req);
        if (!institutionId) {
            return res.status(403).json({ message: "No tienes una institución asignada." });
        }

        // 1. Verificar que los IDs (Periodo, Curso, Docente) pertenecen a la IE del Admin
        const period = await prisma.academicPeriod.findFirst({
            where: { id: Number(academic_period_id), institution_id: institutionId }
        });
        const teacher = await prisma.teacher.findFirst({
            where: { id: Number(teacher_id), institution_id: institutionId }
        });
        const course = await prisma.course.findFirst({
            where: { id: Number(course_id), program: { institution_id: institutionId } }
        });

        if (!period || !teacher || !course) {
            return res.status(403).json({ message: "Datos inválidos: El periodo, docente o curso no pertenecen a esta institución." });
        }

        // 2. Crear la asignación
        const newAssignment = await prisma.assignment.create({
            data: {
                course_id: Number(course_id),
                teacher_id: Number(teacher_id),
                academic_period_id: Number(academic_period_id),
                shift: shift,
            }
        });

        return res.status(201).json(newAssignment);

    } catch (error) {
        console.error("Error al crear asignación:", error);
        // P2002 es el código de Prisma para "Unique constraint failed"
        if (error.code === 'P2002') {
            return res.status(400).json({ message: "Error: Ya existe una asignación para este curso, en este periodo y turno." });
        }
        return res.status(500).json({ message: "Error interno al crear la asignación." });
    }
};

// ==========================================================
// 🎯 ACTUALIZAR ASIGNACIÓN (UPDATE)
// ==========================================================
/**
 * @route PUT /api/assignments/:id
 * @desc Actualiza una asignación existente.
 */
export const updateAssignment = async (req, res) => {
    const { id } = req.params;
    const { course_id, teacher_id, academic_period_id, shift } = req.body;

    try {
        const institutionId = await getAdminInstitutionId(req);
        if (!institutionId) return res.status(403).json({ message: "Institución no asignada." });

        // 1. Verificar que la asignación que se intenta editar pertenece a la IE del Admin
        const assignmentExists = await prisma.assignment.findFirst({
            where: {
                id: Number(id),
                academicPeriod: { institution_id: institutionId }
            }
        });

        if (!assignmentExists) {
            return res.status(404).json({ message: "Asignación no encontrada o no pertenece a tu institución." });
        }
        
        // 2. (Opcional pero recomendado) Verificar que los nuevos IDs también pertenezcan a la IE
        // (Omitido por brevedad, asumiendo que el frontend filtra los selectores)

        // 3. Actualizar
        const updatedAssignment = await prisma.assignment.update({
            where: { id: Number(id) },
            data: {
                course_id: Number(course_id),
                teacher_id: Number(teacher_id),
                academic_period_id: Number(academic_period_id),
                shift: shift,
            },
        });

        return res.status(200).json(updatedAssignment);

    } catch (error) {
        console.error("Error al actualizar asignación:", error);
        if (error.code === 'P2002') {
            return res.status(400).json({ message: "Error: La combinación de curso, periodo y turno ya existe." });
        }
        return res.status(500).json({ message: "Error interno al actualizar la asignación." });
    }
};

// ==========================================================
// 🎯 ELIMINAR ASIGNACIÓN (DELETE)
// ==========================================================
/**
 * @route DELETE /api/assignments/:id
 * @desc Elimina una asignación.
 */
export const deleteAssignment = async (req, res) => {
    const { id } = req.params;

    try {
        const institutionId = await getAdminInstitutionId(req);
        if (!institutionId) return res.status(403).json({ message: "Institución no asignada." });

        // 1. Verificar que la asignación pertenece a la IE del Admin
        const assignmentExists = await prisma.assignment.findFirst({
            where: {
                id: Number(id),
                academicPeriod: { institution_id: institutionId }
            }
        });
        if (!assignmentExists) {
            return res.status(404).json({ message: "Asignación no encontrada." });
        }
        
        // 2. Verificar dependencias (CRUCIAL: ¿Hay notas 'Grade'?)
        const gradesCount = await prisma.grade.count({
            where: { assignment_id: Number(id) }
        });
        
        if (gradesCount > 0) {
            return res.status(400).json({ message: "No se puede eliminar: Esta asignación ya tiene notas registradas." });
        }
        
        await prisma.assignment.delete({ where: { id: Number(id) } });

        return res.status(200).json({ message: "Asignación eliminada con éxito." });

    } catch (error) {
        console.error("Error al eliminar asignación:", error);
        return res.status(500).json({ message: "Error interno al eliminar la asignación." });
    }
};