import prisma from "../prisma.js";

// ==========================================================
// UTILITY: Obtener el ID del Docente (Teacher) desde el User ID
// ==========================================================
/**
 * @description Función auxiliar para obtener el ID de la tabla 'Teacher' 
 * usando el ID del usuario (de req.user).
 */
const getTeacherIdFromUserId = async (userId) => {
    if (!userId) return null;
    
    const teacher = await prisma.teacher.findUnique({
        where: { user_id: userId },
        select: { id: true }
    });
    
    // Devuelve el ID de la tabla Teacher (ej. 5), no el ID de User (ej. 12)
    return teacher?.id || null; 
};


// ==========================================================
// 🎯 OBTENER CLASES ASIGNADAS (Para "Mis Clases")
// ==========================================================
/**
 * @route GET /api/teacher/my-assignments
 * @desc Obtiene todas las asignaciones del docente logueado.
 * @access Docente
 */
export const getMyAssignedClasses = async (req, res) => {
    try {
        const userId = req.user?.id;
        const teacherId = await getTeacherIdFromUserId(userId);

        if (!teacherId) {
            return res.status(403).json({ message: "Acceso denegado. El usuario no es un docente registrado." });
        }

        const assignments = await prisma.assignment.findMany({
            where: { teacher_id: teacherId },
            include: {
                course: {
                    include: {
                        program: {
                            select: { name: true }
                        }
                    }
                },
                academicPeriod: {
                    select: { name: true, start_date: true }
                },
                _count: {
                    // Contamos los estudiantes inscritos en esta clase (desde la tabla Grade)
                    select: { grades: true } 
                }
            },
            orderBy: {
                academicPeriod: {
                    start_date: 'desc'
                }
            }
        });

        // Formatear la respuesta para el frontend
        const formattedAssignments = assignments.map(a => ({
            id: a.id, // ID de la Asignación (Assignment)
            shift: a.shift,
            course_name: a.course.name,
            course_code: a.course.code,
            program_name: a.course.program.name,
            period_name: a.academicPeriod.name,
            student_count: a._count.grades
        }));

        return res.status(200).json(formattedAssignments);

    } catch (error) {
        console.error("Error al listar asignaciones de docente:", error);
        return res.status(500).json({ message: "Error interno al obtener asignaciones." });
    }
};


// ==========================================================
// 🎯 OBTENER ESTUDIANTES Y NOTAS (Para "Evaluaciones")
// ==========================================================
/**
 * @route GET /api/teacher/assignments/:id/grades
 * @desc Obtiene los detalles de una asignación Y la lista de estudiantes/notas.
 * @access Docente
 */
export const getAssignmentDetailsWithGrades = async (req, res) => {
    try {
        const userId = req.user?.id;
        const teacherId = await getTeacherIdFromUserId(userId);
        const assignmentId = Number(req.params.id);

        if (!teacherId) {
            return res.status(403).json({ message: "Acceso denegado. El usuario no es un docente." });
        }

        // 1. Validar que la asignación pertenece a este docente
        const assignment = await prisma.assignment.findFirst({
            where: { 
                id: assignmentId,
                teacher_id: teacherId // Seguridad: El docente solo puede ver sus propias clases
            },
            include: {
                course: { select: { name: true, code: true } },
                academicPeriod: { select: { name: true } }
            }
        });

        if (!assignment) {
            return res.status(404).json({ message: "Asignación no encontrada o no pertenece a este docente." });
        }

        // 2. Buscar las notas (y estudiantes) de esta asignación
        // (Esto asume que los registros 'Grade' se crean 
        // cuando el estudiante se inscribe al curso, ej. en el módulo de Matrícula).
        const grades = await prisma.grade.findMany({
            where: { assignment_id: assignmentId },
            include: {
                student: { // Incluimos el estudiante
                    include: {
                        user: { // Incluimos los datos del usuario
                            select: { first_name: true, last_name: true }
                        }
                    }
                }
            },
            orderBy: {
                student: { user: { last_name: 'asc' } } // Ordenar alfabéticamente
            }
        });

        // 3. Formatear la lista de estudiantes
        const studentsList = grades.map(g => ({
            grade_id: g.id, // ID de la tabla Grade (para el PUT)
            student_id: g.student_id,
            student_name: `${g.student.user.last_name}, ${g.student.user.first_name}`,
            grade: g.grade,
            observation: g.observation
        }));

        // 4. Devolver la respuesta completa
        const response = {
            course_name: assignment.course.name,
            period_name: assignment.academicPeriod.name,
            shift: assignment.shift,
            students: studentsList
        };

        return res.status(200).json(response);

    } catch (error) {
        console.error("Error al obtener detalles de la clase:", error);
        return res.status(500).json({ message: "Error interno al obtener detalles de la clase." });
    }
};

// ==========================================================
// 🎯 ACTUALIZAR NOTAS (Guardar)
// ==========================================================
/**
 * @route PUT /api/teacher/update-grades
 * @desc Actualiza múltiples notas para una asignación.
 * @access Docente
 */
export const updateGrades = async (req, res) => {
    const { assignmentId, grades } = req.body; // grades es un array: [{ grade_id, grade, observation }]
    
    try {
        const userId = req.user?.id;
        const teacherId = await getTeacherIdFromUserId(userId);

        if (!teacherId) {
            return res.status(403).json({ message: "Acceso denegado. El usuario no es un docente." });
        }

        // 1. Validar que la asignación pertenece a este docente
        const assignment = await prisma.assignment.findFirst({
            where: { 
                id: Number(assignmentId),
                teacher_id: teacherId 
            }
        });

        if (!assignment) {
            return res.status(404).json({ message: "Asignación no encontrada o no pertenece a este docente." });
        }

        // 2. Preparar las actualizaciones en una transacción
        const updateOperations = grades.map(g => 
            prisma.grade.update({
                where: { 
                    id: g.grade_id,
                    // Seguridad extra: asegurarse que la nota pertenezca a la asignación
                    assignment_id: Number(assignmentId) 
                },
                data: {
                    grade: g.grade ? Number(g.grade) : null,
                    observation: g.observation || null
                }
            })
        );

        // 3. Ejecutar la transacción
        await prisma.$transaction(updateOperations);

        return res.status(200).json({ message: "Notas actualizadas correctamente." });

    } catch (error) {
        // P2025: Error si un grade_id no existe
        if (error.code === 'P2025') {
            return res.status(400).json({ message: "Error al guardar: Una de las notas no existe o no coincide con la asignación." });
        }
        console.error("Error al actualizar notas:", error);
        return res.status(500).json({ message: "Error interno al guardar las notas." });
    }
};

