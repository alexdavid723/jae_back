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
// 🎯 LISTAR TODAS LAS MATRÍCULAS (READ ALL)
// ==========================================================
export const getAllEnrollments = async (req, res) => {
    try {
        const institutionId = await getAdminInstitutionId(req);
        if (!institutionId) {
            return res.status(403).json({ message: "No tienes una institución asignada." });
        }

        const enrollments = await prisma.enrollment.findMany({
            where: { student: { institution_id: institutionId } },
            include: {
                student: { include: { user: { select: { first_name: true, last_name: true, email: true } } } },
                program: { select: { name: true, id: true } }, 
                admissionProcess: { 
                    select: { 
                        description: true, 
                        id: true, 
                        academicPeriod: { select: { name: true, id: true } } 
                    } 
                }
            },
            orderBy: { enrolled_at: 'desc' }
        });

        // Mapeamos para aplanar la respuesta
        const formattedEnrollments = enrollments.map(e => ({
            id: e.id,
            status: e.status,
            enrolled_at: e.enrolled_at,
            student_name: `${e.student.user.first_name} ${e.student.user.last_name}`,
            program_name: e.program.name,
            admission_process: e.admissionProcess.description || e.admissionProcess.academicPeriod.name,
            
            // IDs necesarios para el modal de edición
            student_id: e.student_id,
            program_id: e.program_id,
            admission_process_id: e.admission_process_id,

            // Objeto academicPeriod (soluciona el error de 'undefined')
            academicPeriod: e.admissionProcess.academicPeriod
        }));

        return res.status(200).json(formattedEnrollments);

    } catch (error) {
        console.error("Error al listar matrículas:", error);
        return res.status(500).json({ message: "Error interno al obtener matrículas." });
    }
};

// ==========================================================
// 🎯 OBTENER MATRÍCULA POR ID (READ SINGLE)
// ==========================================================
export const getEnrollmentById = async (req, res) => {
    const { id } = req.params;
    try {
        const institutionId = await getAdminInstitutionId(req);
        if (!institutionId) {
            return res.status(403).json({ message: "Institución no asignada." });
        }

        const enrollment = await prisma.enrollment.findFirst({
            where: {
                id: Number(id),
                student: { institution_id: institutionId } 
            },
            select: {
                id: true,
                student_id: true,
                program_id: true,
                admission_process_id: true,
                status: true,
                // Necesitamos el periodId para buscar cursos disponibles
                admissionProcess: {
                    select: {
                        academic_period_id: true,
                        academicPeriod: { select: { name: true } } 
                    }
                }
            }
        });

        if (!enrollment) {
            return res.status(404).json({ message: "Matrícula no encontrada o no pertenece a tu institución." });
        }

        return res.status(200).json(enrollment);
    } catch (error) {
        console.error("Error al obtener matrícula por ID:", error);
        return res.status(500).json({ message: "Error interno del servidor." });
    }
};

// ==========================================================
// 🎯 CREAR NUEVA MATRÍCULA (CREATE)
// ==========================================================
export const createEnrollment = async (req, res) => {
    const { student_id, program_id, admission_process_id, status } = req.body;

    try {
        const institutionId = await getAdminInstitutionId(req);
        if (!institutionId) {
            return res.status(403).json({ message: "No tienes una institución asignada." });
        }

        if (!student_id || !program_id || !admission_process_id) {
            return res.status(400).json({ message: "Se requieren Estudiante, Programa y Proceso de Admisión." });
        }

        // Verificación de seguridad
        const student = await prisma.student.findFirst({
            where: { id: Number(student_id), institution_id: institutionId }
        });
        const program = await prisma.program.findFirst({
            where: { id: Number(program_id), institution_id: institutionId }
        });
        const process = await prisma.admissionProcess.findFirst({
            where: { id: Number(admission_process_id), academicPeriod: { institution_id: institutionId } }
        });

        if (!student || !program || !process) {
            return res.status(403).json({ message: "Datos inválidos: El estudiante, programa o proceso de admisión no pertenecen a esta institución." });
        }

        // Evitar duplicados
        const existingEnrollment = await prisma.enrollment.findFirst({
            where: {
                student_id: Number(student_id),
                program_id: Number(program_id),
                admission_process_id: Number(admission_process_id)
            }
        });
        if (existingEnrollment) {
            return res.status(400).json({ message: "Este estudiante ya está matriculado en este programa para este proceso de admisión." });
        }

        // Crear la Matrícula
        const newEnrollment = await prisma.enrollment.create({
            data: {
                student_id: Number(student_id),
                program_id: Number(program_id),
                admission_process_id: Number(admission_process_id),
                status: status || "matriculado", 
            }
        });

        return res.status(201).json(newEnrollment);

    } catch (error) {
        console.error("Error al crear matrícula:", error);
        if (error.code === 'P2002') {
            return res.status(400).json({ message: "Error de duplicidad al matricular." });
        }
        return res.status(500).json({ message: "Error interno al crear la matrícula." });
    }
};

// ==========================================================
// 🎯 ACTUALIZAR MATRÍCULA (UPDATE)
// ==========================================================
export const updateEnrollment = async (req, res) => {
    const { id } = req.params;
    const { status, student_id, program_id, admission_process_id } = req.body; 

    try {
        const institutionId = await getAdminInstitutionId(req);
        if (!institutionId) return res.status(403).json({ message: "Institución no asignada." });

        const enrollmentExists = await prisma.enrollment.findFirst({
            where: { id: Number(id), student: { institution_id: institutionId } }
        });
        if (!enrollmentExists) {
            return res.status(404).json({ message: "Matrícula no encontrada o no pertenece a tu institución." });
        }
        
        const updatedEnrollment = await prisma.enrollment.update({
            where: { id: Number(id) },
            data: {
                status: status, 
                student_id: Number(student_id),
                program_id: Number(program_id),
                admission_process_id: Number(admission_process_id),
            },
        });

        return res.status(200).json(updatedEnrollment);

    } catch (error) {
        console.error("Error al actualizar matrícula:", error);
        return res.status(500).json({ message: "Error interno al actualizar la matrícula." });
    }
};

// ==========================================================
// 🎯 ELIMINAR MATRÍCULA (DELETE)
// ==========================================================
export const deleteEnrollment = async (req, res) => {
    const { id } = req.params;

    try {
        const institutionId = await getAdminInstitutionId(req);
        if (!institutionId) return res.status(403).json({ message: "Institución no asignada." });

        const enrollmentExists = await prisma.enrollment.findUnique({
            where: { id: Number(id) },
            select: { student_id: true, admission_process_id: true, student: { select: { institution_id: true } } }
        });
        
        if (!enrollmentExists || enrollmentExists.student.institution_id !== institutionId) {
            return res.status(404).json({ message: "Matrícula no encontrada." });
        }
        
        const { student_id, admission_process_id } = enrollmentExists;

        const admissionProcess = await prisma.admissionProcess.findUnique({
            where: { id: admission_process_id },
            select: { academic_period_id: true }
        });
        if (!admissionProcess) {
            return res.status(404).json({ message: "Proceso de admisión asociado no encontrado." });
        }
        const periodId = admissionProcess.academic_period_id;

        const assignmentsInPeriod = await prisma.assignment.findMany({
            where: { academic_period_id: periodId },
            select: { id: true }
        });
        const assignmentIds = assignmentsInPeriod.map(a => a.id);
        
        // Iniciar Transacción
        await prisma.$transaction(async (tx) => {
            // 1. Eliminar 'Grade' (Notas)
            await tx.grade.deleteMany({
                where: {
                    student_id: student_id,
                    assignment_id: { in: assignmentIds }
                }
            });
            // 2. Eliminar 'EnrollmentCourse'
            await tx.enrollmentCourse.deleteMany({
                where: { enrollment_id: Number(id) }
            });
            // 3. Eliminar 'EnrollmentSheetItem'
            await tx.enrollmentSheetItem.deleteMany({
                where: { enrollment_id: Number(id) }
            });
            // 4. Eliminar 'Enrollment' (La matrícula principal)
            await tx.enrollment.delete({ 
                where: { id: Number(id) } 
            });
        });

        return res.status(200).json({ message: "Matrícula (y sus cursos inscritos) anulada con éxito." });

    } catch (error) {
        console.error("Error al eliminar matrícula:", error);
        if (error.code === 'P2003') {
            return res.status(400).json({ message: "No se puede eliminar: Aún existen dependencias." });
        }
        return res.status(500).json({ message: "Error interno al eliminar la matrícula." });
    }
};


// ==========================================================
// 💡 FUNCIONES PARA GESTIONAR CURSOS (Grades Y EnrollmentCourse)
// ==========================================================

/**
 * @route GET /api/enrollments/:studentId/registered-courses
 */
export const getEnrolledCourses = async (req, res) => {
    const { studentId } = req.params;
    const { periodId } = req.query; 

    try {
        const institutionId = await getAdminInstitutionId(req);
        if (!institutionId) return res.status(403).json({ message: "Institución no asignada." });

        if (!studentId || !periodId) {
            return res.status(400).json({ message: "Se requiere ID de estudiante y ID de periodo." });
        }

        const enrolled = await prisma.grade.findMany({
            where: {
                student_id: Number(studentId),
                assignment: {
                    academic_period_id: Number(periodId)
                }
            },
            include: {
                assignment: {
                    include: {
                        course: { select: { name: true, id: true } }, 
                        teacher: { include: { user: { select: { first_name: true, last_name: true } } } }
                    }
                }
            }
        });

        const formatted = enrolled.map(g => ({
            grade_id: g.id, 
            course_id: g.assignment.course.id, 
            assignment_id: g.assignment_id, 
            course_name: g.assignment.course.name,
            teacher_name: `${g.assignment.teacher.user.first_name} ${g.assignment.teacher.user.last_name}`,
            shift: g.assignment.shift
        }));

        return res.status(200).json(formatted);
    } catch (error) {
        console.error("Error al listar cursos inscritos:", error);
        return res.status(500).json({ message: "Error interno del servidor." });
    }
};

/**
 * @route GET /api/enrollments/:studentId/available-courses
 */
export const getAvailableCourses = async (req, res) => {
    const { studentId } = req.params;
    const { periodId, programId } = req.query; 

    try {
        const institutionId = await getAdminInstitutionId(req);
        if (!institutionId) return res.status(403).json({ message: "Institución no asignada." });
        
        if (!studentId || !periodId || !programId) { 
            return res.status(400).json({ message: "Se requiere ID de estudiante, ID de periodo y ID de programa." });
        }

        const enrolledGrades = await prisma.grade.findMany({
            where: { 
                student_id: Number(studentId),
                assignment: {
                    academic_period_id: Number(periodId)
                }
            },
            select: { assignment_id: true }
        });
        const enrolledAssignmentIds = enrolledGrades.map(g => g.assignment_id);

        const available = await prisma.assignment.findMany({
            where: {
                academic_period_id: Number(periodId),
                course: {
                    program_id: Number(programId)
                },
                id: {
                    notIn: enrolledAssignmentIds
                }
            },
            include: {
                course: { select: { name: true, id: true } }, 
                teacher: { include: { user: { select: { first_name: true, last_name: true } } } }
            }
        });

        const formatted = available.map(a => ({
            assignment_id: a.id, 
            course_id: a.course.id, 
            course_name: a.course.name,
            teacher_name: `${a.teacher.user.first_name} ${a.teacher.user.last_name}`,
            shift: a.shift
        }));

        return res.status(200).json(formatted);
    } catch (error) {
        console.error("Error al listar cursos disponibles:", error);
        return res.status(500).json({ message: "Error interno del servidor." });
    }
};

/**
 * @route POST /api/enrollments/register-course
 */
export const enrollStudentInCourse = async (req, res) => {
    const { student_id, assignment_id, enrollment_id, course_id } = req.body;

    try {
        const institutionId = await getAdminInstitutionId(req);
        if (!institutionId) return res.status(403).json({ message: "Institución no asignada." });
        
        if (!student_id || !assignment_id || !enrollment_id || !course_id) {
            return res.status(400).json({ message: "Faltan IDs (Estudiante, Asignación, Matrícula o Curso)." });
        }

        await prisma.$transaction(async (tx) => {
            const existingGrade = await tx.grade.findFirst({
                where: { student_id: Number(student_id), assignment_id: Number(assignment_id) }
            });
            if (!existingGrade) {
                await tx.grade.create({
                    data: {
                        student_id: Number(student_id),
                        assignment_id: Number(assignment_id),
                        grade: null, 
                        observation: null
                    }
                });
            }

            const existingEnrollmentCourse = await tx.enrollmentCourse.findFirst({
                where: { enrollment_id: Number(enrollment_id), course_id: Number(course_id) }
            });
            if (!existingEnrollmentCourse) {
                await tx.enrollmentCourse.create({
                    data: {
                        enrollment_id: Number(enrollment_id),
                        course_id: Number(course_id)
                    }
                });
            }
        });
        
        res.status(201).json({ message: "Estudiante inscrito en el curso." });

    } catch (error) {
        console.error("Error al inscribir curso:", error);
        res.status(500).json({ message: "Error interno del servidor." });
    }
};

/**
 * @route DELETE /api/enrollments/remove-course/:grade_id
 */
export const removeStudentFromCourse = async (req, res) => {
    const { grade_id } = req.params; // Usamos el ID de la tabla Grade
    const { enrollment_id, course_id } = req.body;

    try {
        const institutionId = await getAdminInstitutionId(req);
        if (!institutionId) return res.status(403).json({ message: "Institución no asignada." });
        
        if (!enrollment_id || !course_id) {
             return res.status(400).json({ message: "Faltan IDs (Matrícula o Curso) para anular el curso." });
        }

        await prisma.$transaction(async (tx) => {
            await tx.grade.delete({
                where: { id: Number(grade_id) }
            });

            await tx.enrollmentCourse.deleteMany({
                where: {
                    enrollment_id: Number(enrollment_id),
                    course_id: Number(course_id)
                }
            });
        });
        
        res.status(200).json({ message: "Curso anulado de la matrícula." });

    } catch (error) {
        console.error("Error al anular curso:", error);
        res.status(500).json({ message: "Error interno del servidor." });
    }
};

// ==========================================================
// 💡 NUEVA FUNCIÓN PARA EL REPORTE (NÓMINA) - CORREGIDA
// ==========================================================
/**
 * @route GET /api/enrollments/full-roster
 * @desc Obtiene la nómina completa de matrículas (Estudiante, Curso, Docente, Periodo, Nota).
 */
export const getFullEnrollmentRoster = async (req, res) => {
    try {
        const institutionId = await getAdminInstitutionId(req);
        if (!institutionId) {
            return res.status(403).json({ message: "No tienes una institución asignada." });
        }

        // 1. Obtenemos los datos de la Institución primero (para el encabezado)
        const institution = await prisma.institution.findUnique({
            where: { id: institutionId },
        });

        // 2. Empezamos desde 'Grade' (la inscripción al curso)
        const grades = await prisma.grade.findMany({
            where: {
                assignment: {
                    academicPeriod: {
                        institution_id: institutionId
                    }
                }
            },
            include: {
                student: { 
                    include: { 
                        user: { select: { first_name: true, last_name: true, email: true } } 
                    } 
                },
                assignment: {
                    include: {
                        course: { 
                            include: { 
                                program: { 
                                    select: { name: true, faculty: { select: { name: true } } } 
                                } 
                            } 
                        },
                        teacher: { 
                            include: { 
                                user: { select: { first_name: true, last_name: true } } 
                            } 
                        },
                        academicPeriod: { select: { name: true, start_date: true, end_date: true } }
                    }
                }
            },
            orderBy: [
                { assignment: { academicPeriod: { name: 'desc' } } },
                { student: { user: { last_name: 'asc' } } } 
            ]
        });

        // 3. Mapeamos a un formato plano EXACTAMENTE como tu plantilla de Excel
        let nroOrden = 1;
        const roster = grades.map(g => ({
            // --- Encabezado (se repite en cada fila) ---
            "REGION": "PUNO", // Placeholder (No está en tu BD)
            "UGEL": "JULIACA", // Placeholder (No está en tu BD)
            "CETPRO": institution?.name || "N/A",
            "GESTION PUBLICA": "X", // Placeholder
            "GESTION PRIVADA": "", // Placeholder
            "CONVENIO": "", // Placeholder
            "PROVINCIA": "SAN ROMAN", // Placeholder
            "DISTRITO": "JULIACA", // Placeholder
            "LUGAR": institution?.address || "N/A",
            "DIRECCION": institution?.address || "N/A",
            "ACTIVIDAD": "N/A", // Placeholder
            "FAMILIA PROF": g.assignment.course.program.faculty?.name || "N/A", 
            "OPCION OCUPACIONAL O ESPECIALIDAD": g.assignment.course.program.name,
            "MODULO": g.assignment.course.name,
            "CICLO": g.assignment.course.semester || "N/A",
            "FECHA DE INICIO": g.assignment.academicPeriod.start_date,
            "FECHA DE TERMINO": g.assignment.academicPeriod.end_date,
            "TURNO": g.assignment.shift,
            "SECCION": "UNICA", // Placeholder

            // --- Detalle (Estudiante) ---
            "N° Ord.": nroOrden++,
            "CÓDIGO INSCRIPCIÓN": g.student_id, 
            "APELLIDOS Y NOMBRES": `${g.student.user.last_name}, ${g.student.user.first_name}`,
            "SEXO M-F": "N/A", 
            "EDAD": "N/A", 
            "CONDICIÓN (G-P-B)": "G" // Placeholder (Gratuito)
        }));

        return res.status(200).json(roster);

    } catch (error) {
        console.error("Error al generar la nómina:", error);
        return res.status(500).json({ message: "Error interno al generar la nómina." });
    }
};

