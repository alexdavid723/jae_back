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
// 🎯 LISTAR PERSONAL INSTITUCIONAL (Docentes y Estudiantes)
// ==========================================================
/**
 * @route GET /api/personnel/list-all-institutional
 * @desc Obtiene la lista de Docentes y Estudiantes de la IE del Admin.
 */
export const getInstitutionalPersonnel = async (req, res) => {
    try {
        const institutionId = await getAdminInstitutionId(req);

        if (!institutionId) {
            return res.status(403).json({ message: "No tienes una institución asignada para consultar personal." });
        }

        // 1. Buscar usuarios que sean Teachers O Students de esta institución.
        const personnel = await prisma.user.findMany({
            where: {
                OR: [
                    // (Encuentra Usuarios que tengan un Teacher asociado a esta IE)
                    { Teacher: { institution_id: institutionId } },
                    
                    // (Encuentra Usuarios que tengan un Student asociado a esta IE)
                    { Student: { institution_id: institutionId } },
                ],
            },
            include: {
                role: { select: { name: true } },
                Teacher: { select: { specialization: true, id: true } }, // Incluimos el ID de Teacher
                Student: { select: { id: true } }, // Incluimos el ID de Student
            },
            orderBy: [{ last_name: 'asc' }],
        });

        // 2. Formatear la respuesta para el frontend
        const formattedPersonnel = personnel.map(user => {
            const roleName = user.role?.name;
            const isDocente = roleName === 'docente';

            return {
                id: user.id, // ID del User (para DELETE/UPDATE)
                user_id: user.id, // (Redundante pero asegura compatibilidad con el modal)
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
                status: user.status,
                roleName: roleName,
                // Campo específico del Docente
                specialization: isDocente ? user.Teacher?.specialization || null : null,
            };
        }).filter(p => p.roleName === 'docente' || p.roleName === 'estudiante');

        return res.status(200).json(formattedPersonnel);

    } catch (error) {
        console.error("Error al listar personal institucional:", error);
        return res.status(500).json({ message: "Error interno al obtener el personal." });
    }
};

// ==========================================================
// 🎯 LISTAR DOCENTES (SIMPLE) - (PARA MODALES DE ASIGNACIÓN)
// ==========================================================
/**
 * @route GET /api/personnel/teachers-simple
 * @desc Obtiene una lista ligera (id, first_name, last_name) de Docentes de la IE del Admin.
 */
export const getListSimpleTeachers = async (req, res) => {
    try {
        const institutionId = await getAdminInstitutionId(req);
        if (!institutionId) {
            return res.status(403).json({ message: "No tienes una institución asignada." });
        }

        // Buscamos docentes (Teachers) filtrando por la IE
        const teachers = await prisma.teacher.findMany({
            where: {
                institution_id: institutionId,
                user: { status: true } // Opcional: filtrar solo docentes activos
            },
            include: {
                user: { // Necesitamos el nombre desde la tabla User
                    select: {
                        first_name: true,
                        last_name: true
                    }
                }
            },
            orderBy: { user: { first_name: 'asc' } }
        });

        // Mapeamos para el formato que espera el modal: { id, first_name, last_name }
        // 💡 Usamos t.id (ID de la tabla Teacher), NO t.user.id
        const formattedTeachers = teachers.map(t => ({
            id: t.id, 
            first_name: t.user.first_name,
            last_name: t.user.last_name
        }));

        return res.status(200).json(formattedTeachers);

    } catch (error) {
        console.error("Error en getListSimpleTeachers:", error);
        return res.status(500).json({ message: "Error interno al listar docentes." });
    }
};

// ==========================================================
// 🎯 LISTAR ESTUDIANTES (SIMPLE) - (FUNCIÓN AÑADIDA)
// ==========================================================
/**
 * @route GET /api/personnel/students-simple
 * @desc Obtiene una lista ligera (id, first_name, last_name) de Estudiantes de la IE del Admin.
 */
export const getListSimpleStudents = async (req, res) => {
    try {
        const institutionId = await getAdminInstitutionId(req);
        if (!institutionId) {
            return res.status(403).json({ message: "No tienes una institución asignada." });
        }

        // Buscamos estudiantes (Students) filtrando por la IE
        const students = await prisma.student.findMany({
            where: {
                institution_id: institutionId,
                user: { status: true } // Opcional: filtrar solo estudiantes activos
            },
            include: {
                user: { // Necesitamos el nombre desde la tabla User
                    select: {
                        first_name: true,
                        last_name: true
                    }
                }
            },
            orderBy: { user: { first_name: 'asc' } }
        });

        // Mapeamos para el formato { id (Student), first_name, last_name }
        const formattedStudents = students.map(s => ({
            id: s.id, // 💡 ID de la tabla Student (requerido por enrollmentController)
            first_name: s.user.first_name,
            last_name: s.user.last_name
        }));

        return res.status(200).json(formattedStudents);

    } catch (error) {
        console.error("Error en getListSimpleStudents:", error);
        return res.status(500).json({ message: "Error interno al listar estudiantes." });
    }
};

