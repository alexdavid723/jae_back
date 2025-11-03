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
// 🎯 LISTAR CURSOS (SIMPLE) - (PARA MODALES)
// ==========================================================
/**
 * @route GET /api/courses/list-simple
 * @desc Obtiene una lista ligera (id, name) de cursos de la IE del Admin.
 */
export const getListSimpleCourses = async (req, res) => {
    try {
        const institutionId = await getAdminInstitutionId(req);
        if (!institutionId) {
            return res.status(403).json({ message: "No tienes una institución asignada." });
        }

        // Buscamos cursos filtrando por la institución del programa al que pertenecen
        const courses = await prisma.course.findMany({
            where: {
                program: {
                    institution_id: institutionId
                }
            },
            select: {
                id: true,
                name: true
            },
            orderBy: { name: 'asc' }
        });

        return res.status(200).json(courses);

    } catch (error) {
        console.error("Error en getListSimpleCourses:", error);
        return res.status(500).json({ message: "Error interno al listar cursos." });
    }
};


// ==========================================================
// 🎯 LISTAR TODOS LOS CURSOS (PARA TABLA PRINCIPAL)
// ==========================================================
/**
 * @route GET /api/courses
 * @desc Obtener todos los Cursos (Filtrados por IE).
 */
export const getCourses = async (req, res) => {
    try {
        const institutionId = await getAdminInstitutionId(req);
        if (!institutionId) {
            return res.status(403).json({ message: "No tienes una institución asignada." });
        }

        const courses = await prisma.course.findMany({
            // 💡 CORRECCIÓN: Filtramos cursos por la IE del Admin
            where: {
                program: {
                    institution_id: institutionId
                }
            },
            include: { 
                program: { 
                    select: { 
                        name: true, 
                        id: true 
                    } 
                } 
            }, 
        });
        
        // Devolvemos el array de datos directamente
        res.status(200).json(courses);
    } catch (error) {
        console.error("Error al obtener cursos:", error);
        res.status(500).json({ message: 'Error interno del servidor al listar cursos.' });
    }
};

// ==========================================================
// 🎯 OBTENER CURSO POR ID (CON SEGURIDAD)
// ==========================================================
/**
 * @route GET /api/courses/:id
 */
export const getCourseById = async (req, res) => {
    const id = parseInt(req.params.id); 
    
    try {
        const institutionId = await getAdminInstitutionId(req);
        if (!institutionId) return res.status(403).json({ message: "Institución no asignada." });

        const course = await prisma.course.findUnique({
            where: { id: id },
            include: { 
                program: { 
                    select: { 
                        name: true, 
                        id: true, 
                        institution_id: true 
                    } 
                } 
            }
        });

        if (!course) {
            return res.status(404).json({ message: `Curso con ID ${id} no encontrado.` });
        }

        // 💡 CORRECCIÓN: Validamos que el curso pertenezca a la IE del Admin
        if (course.program.institution_id !== institutionId) {
            return res.status(403).json({ message: "Acceso denegado. Este curso no pertenece a tu institución." });
        }

        res.status(200).json(course);
    } catch (error) {
        console.error("Error al obtener curso por ID:", error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};

// ==========================================================
// 🎯 CREAR NUEVO CURSO (CON SEGURIDAD)
// ==========================================================
/**
 * @route POST /api/courses
 */
export const createCourse = async (req, res) => {
    const { program_id, code, name, credits, semester } = req.body; 

    if (!program_id || !code || !name || credits === undefined || semester === undefined) {
        return res.status(400).json({ message: 'Faltan campos obligatorios: program_id, code, name, credits y semester.' });
    }

    try {
        const institutionId = await getAdminInstitutionId(req);
        if (!institutionId) return res.status(403).json({ message: "Institución no asignada." });

        // 💡 CORRECCIÓN: Validamos que el Programa (program_id) pertenezca a la IE del Admin
        const program = await prisma.program.findUnique({ where: { id: Number(program_id) } });
        if (!program || program.institution_id !== institutionId) {
            return res.status(403).json({ message: "Acceso denegado. El programa seleccionado no pertenece a tu institución." });
        }

        const newCourse = await prisma.course.create({
            data: {
                program_id: parseInt(program_id),
                code,
                name,
                credits: parseInt(credits),
                semester: parseInt(semester),
            }
        });

        res.status(201).json(newCourse);
    } catch (error) {
        console.error("Error al crear curso:", error);
        if (error.code === 'P2002') { 
            return res.status(409).json({ message: 'El código del curso ya existe.' });
        }
        res.status(500).json({ message: 'Error al crear curso.' });
    }
};

// ==========================================================
// 🎯 ACTUALIZAR CURSO (CON SEGURIDAD)
// ==========================================================
/**
 * @route PUT /api/courses/:id
 */
export const updateCourse = async (req, res) => {
    const id = parseInt(req.params.id); 
    const { program_id, code, name, credits, semester } = req.body; 

    try {
        const institutionId = await getAdminInstitutionId(req);
        if (!institutionId) return res.status(403).json({ message: "Institución no asignada." });

        // 1. Validamos que el curso que se quiere editar pertenezca a la IE del Admin
        const existingCourse = await prisma.course.findUnique({
            where: { id: id },
            include: { program: true }
        });

        if (!existingCourse || existingCourse.program.institution_id !== institutionId) {
            return res.status(403).json({ message: "Acceso denegado. No puedes editar este curso." });
        }

        // 2. Preparamos la data
        const dataToUpdate = {};
        if (program_id !== undefined) {
            // 2b. Si cambia el program_id, validamos que el NUEVO programa también pertenezca a la IE
            const newProgram = await prisma.program.findUnique({ where: { id: Number(program_id) } });
            if (!newProgram || newProgram.institution_id !== institutionId) {
                return res.status(403).json({ message: "Acceso denegado. El nuevo programa no pertenece a tu institución." });
            }
            dataToUpdate.program_id = parseInt(program_id);
        }
        if (code !== undefined) dataToUpdate.code = code;
        if (name !== undefined) dataToUpdate.name = name;
        if (credits !== undefined) dataToUpdate.credits = parseInt(credits);
        if (semester !== undefined) dataToUpdate.semester = parseInt(semester);

        if (Object.keys(dataToUpdate).length === 0) {
            return res.status(400).json({ message: "No hay campos válidos para actualizar." });
        }

        // 3. Actualizamos
        const updatedCourse = await prisma.course.update({
            where: { id: id },
            data: dataToUpdate,
        });

        res.status(200).json(updatedCourse);
    } catch (error) {
        console.error("Error al actualizar curso:", error);
        if (error.code === 'P2025') {
            return res.status(404).json({ message: `Curso con ID ${id} no encontrado.` });
        }
        if (error.code === 'P2002') { 
            return res.status(409).json({ message: 'El código del curso ya existe.' });
        }
        res.status(500).json({ message: 'Error al actualizar curso.' });
    }
};

// ==========================================================
// 🎯 ELIMINAR CURSO (CON SEGURIDAD)
// ==========================================================
/**
 * @route DELETE /api/courses/:id
 */
export const deleteCourse = async (req, res) => {
    const id = parseInt(req.params.id); 

    try {
        const institutionId = await getAdminInstitutionId(req);
        if (!institutionId) return res.status(403).json({ message: "Institución no asignada." });

        // 1. Validamos que el curso que se quiere eliminar pertenezca a la IE del Admin
        const existingCourse = await prisma.course.findUnique({
            where: { id: id },
            include: { program: true }
        });
        if (!existingCourse || existingCourse.program.institution_id !== institutionId) {
            return res.status(403).json({ message: "Acceso denegado. No puedes eliminar este curso." });
        }
        
        // 2. Verificar dependencias (Assignment, EnrollmentCourse)
        const assignments = await prisma.assignment.count({ where: { course_id: id } });
        if (assignments > 0) {
            return res.status(400).json({ message: "No se puede eliminar: El curso tiene docentes asignados." });
        }

        // 3. Eliminar
        await prisma.course.delete({
            where: { id: id },
        });

        res.status(200).json({ message: `Curso ${id} eliminado exitosamente.` });
    } catch (error) {
        console.error("Error al eliminar curso:", error);
        
        if (error.code === 'P2025') {
            return res.status(404).json({ message: `Curso con ID ${id} no encontrado.` });
        }
        if (error.code === 'P2003') { // Error de restricción de clave foránea
             return res.status(400).json({ message: "No se puede eliminar: El curso tiene dependencias (ej. asignaciones o matrículas)." });
        }
        res.status(500).json({ message: 'Error al eliminar curso.' });
    }
};

