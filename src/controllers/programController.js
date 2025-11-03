import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

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
// 🎯 LISTAR TODOS LOS PROGRAMAS (READ ALL)
// ==========================================================
export const getAllPrograms = async (req, res) => {
    try {
        const institutionId = await getAdminInstitutionId(req);

        if (!institutionId) {
            return res.status(403).json({ message: "No tienes una institución asignada para consultar programas." });
        }

        const programs = await prisma.program.findMany({
            where: { institution_id: institutionId },
            include: {
                // Relaciones en minúsculas (corregido)
                plan: { select: { title: true } }, 
                faculty: { select: { name: true } }
            },
            orderBy: [{ name: 'asc' }]
        });

        // Mapeo incluyendo los títulos (para la tabla principal)
        const formattedPrograms = programs.map(p => ({
            id: p.id,
            name: p.name,
            description: p.description,
            duration_months: p.duration_months,
            duration_years: p.duration_years,
            is_active: p.is_active,
            plan_id: p.plan_id, // ⚠️ Aseguramos que los IDs se envíen para la edición futura
            faculty_id: p.faculty_id, // ⚠️ Aseguramos que los IDs se envíen para la edición futura
            plan_title: p.plan.title,
            faculty_name: p.faculty.name
        }));

        return res.status(200).json(formattedPrograms);

    } catch (error) {
        console.error("Error al listar programas:", error);
        return res.status(500).json({ message: "Error interno al obtener los programas." });
    }
};

// ==========================================================
// 🎯 OBTENER PROGRAMA POR ID (READ SINGLE) 👈 FUNCIÓN FALTANTE
// ==========================================================
/**
 * @route GET /api/programs/:id
 * @desc Obtiene un solo programa para la edición.
 */
export const getProgramById = async (req, res) => {
    const id = parseInt(req.params.id);
    try {
        const institutionId = await getAdminInstitutionId(req);
        if (!institutionId) return res.status(403).json({ message: "Institución no asignada." });

        const program = await prisma.program.findUnique({
            where: { id: id, institution_id: institutionId },
            // NO USAMOS INCLUDE AQUÍ, SOLO SELECCIONAMOS LOS CAMPOS DE LA TABLA
            // PARA EVITAR ERRORES DE CICLO EN LA RESPUESTA JSON.
            select: {
                id: true,
                name: true,
                description: true,
                duration_months: true,
                duration_years: true,
                is_active: true,
                plan_id: true,      // 👈 CRUCIAL: Necesario para el formulario
                faculty_id: true,   // 👈 CRUCIAL: Necesario para el formulario
                institution_id: true,
            }
        });

        if (!program) {
            return res.status(404).json({ message: "Programa no encontrado o no pertenece a tu institución." });
        }

        return res.status(200).json(program);
    } catch (error) {
        console.error("Error al obtener programa por ID:", error);
        return res.status(500).json({ message: "Error interno al obtener el programa." });
    }
};


// ==========================================================
// 🎯 CREAR NUEVO PROGRAMA (CREATE)
// ==========================================================
export const createProgram = async (req, res) => { 
    const { name, description, duration_months, is_active, plan_id, faculty_id } = req.body; 

    try {
        const institutionId = await getAdminInstitutionId(req);

        if (!institutionId) {
            return res.status(403).json({ message: "Institución no asignada." });
        }
        
        // 1. Validación de campos esenciales
        if (!name || !duration_months || !plan_id || !faculty_id) {
             return res.status(400).json({ message: "Faltan campos obligatorios: nombre, duración (meses), plan de estudio y facultad/área." });
        }
        
        // 2. Validación de pertenencia (Plan y Faculty deben ser de esta IE)
        const plan = await prisma.plan.findUnique({ where: { id: Number(plan_id) } });
        if (!plan || plan.institution_id !== institutionId) {
            return res.status(400).json({ message: "El Plan de Estudio seleccionado no existe o no pertenece a tu institución." });
        }
        
        const faculty = await prisma.faculty.findUnique({ where: { id: Number(faculty_id) } });
        if (!faculty || faculty.institution_id !== institutionId) {
            return res.status(400).json({ message: "La Facultad/Área seleccionada no existe o no pertenece a tu institución." });
        }

        // Cálculo de años
        const durationYears = Math.ceil(Number(duration_months) / 12); 

        const newProgram = await prisma.program.create({
            data: {
                institution_id: institutionId,
                plan_id: Number(plan_id), 
                faculty_id: Number(faculty_id), 
                
                name,
                description,
                duration_months: Number(duration_months),
                duration_years: durationYears, 
                is_active: is_active ?? true,
            },
            include: { plan: { select: { title: true } } } 
        });

        return res.status(201).json(newProgram);

    } catch (error) {
        console.error("Error al crear programa:", error);
        if (error.code === 'P2002') {
             return res.status(400).json({ message: "Ya existe un programa curricular con el mismo nombre en tu institución." });
        }
        return res.status(500).json({ message: "Error interno al crear el programa.", error: error.message });
    }
};

// ==========================================================
// 🎯 ACTUALIZAR PROGRAMA (UPDATE)
// ==========================================================
export const updateProgram = async (req, res) => { 
    const { id } = req.params;
    const { name, description, duration_months, is_active, plan_id, faculty_id } = req.body;

    try {
        const institutionId = await getAdminInstitutionId(req);
        if (!institutionId) return res.status(403).json({ message: "Institución no asignada." });

        // 1. Verificar que el programa existe y pertenece a la IE del admin
        const program = await prisma.program.findUnique({ where: { id: Number(id) } });

        if (!program || program.institution_id !== institutionId) {
            return res.status(404).json({ message: "Programa no encontrado o no pertenece a tu institución." });
        }
        
        // 2. Validar cambios en las FKs (si se envían)
        if (plan_id && Number(plan_id) !== program.plan_id) {
            const plan = await prisma.plan.findUnique({ where: { id: Number(plan_id) } });
            if (!plan || plan.institution_id !== institutionId) {
                 return res.status(400).json({ message: "El Plan de Estudio seleccionado no existe o no pertenece a tu institución." });
            }
        }
        if (faculty_id && Number(faculty_id) !== program.faculty_id) {
            const faculty = await prisma.faculty.findUnique({ where: { id: Number(faculty_id) } });
            if (!faculty || faculty.institution_id !== institutionId) {
                 return res.status(400).json({ message: "La Facultad/Área seleccionada no existe o no pertenece a tu institución." });
            }
        }
        
        // 3. Preparar los datos para la actualización
        const updateData = {
            name,
            description,
            is_active,
            plan_id: plan_id ? Number(plan_id) : undefined,
            faculty_id: faculty_id ? Number(faculty_id) : undefined,
            
            // Recalcular la duración si los meses cambian
            duration_months: duration_months ? Number(duration_months) : undefined,
            duration_years: duration_months ? Math.ceil(Number(duration_months) / 12) : undefined,
        };

        const updatedProgram = await prisma.program.update({
            where: { id: Number(id) },
            data: updateData,
        });

        return res.status(200).json(updatedProgram);

    } catch (error) {
        console.error("Error al actualizar programa:", error);
        if (error.code === 'P2002') {
             return res.status(400).json({ message: "Ya existe otro programa con el mismo nombre en tu institución." });
        }
        return res.status(500).json({ message: "Error interno al actualizar el programa.", error: error.message });
    }
};

// ==========================================================
// 🎯 ELIMINAR PROGRAMA (DELETE)
// ==========================================================
export const deleteProgram = async (req, res) => {
    const { id } = req.params;

    try {
        const institutionId = await getAdminInstitutionId(req);
        if (!institutionId) return res.status(403).json({ message: "Institución no asignada." });

        // 1. Verificar existencia y pertenencia
        const program = await prisma.program.findUnique({ where: { id: Number(id) } });

        if (!program || program.institution_id !== institutionId) {
            return res.status(404).json({ message: "Programa no encontrado o no pertenece a tu institución." });
        }
        
        // 2. Verificar dependencias: Cursos/Módulos asociados
        const coursesCount = await prisma.course.count({
            where: { program_id: Number(id) }
        });
        
        if (coursesCount > 0) {
            return res.status(400).json({ message: "No se puede eliminar el programa: tiene módulos/cursos curriculares asociados." });
        }
        
        await prisma.program.delete({ where: { id: Number(id) } });

        return res.status(200).json({ message: "Programa curricular eliminado con éxito." });

    } catch (error) {
        if (error.code === 'P2003') {
             return res.status(400).json({ message: "No se puede eliminar el programa: existen dependencias activas (ej. matrículas)." });
        }
        console.error("Error al eliminar programa:", error);
        return res.status(500).json({ message: "Error interno al eliminar el programa." });
    }
};
