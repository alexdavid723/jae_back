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
// 🎯 LISTAR TODAS LAS ÁREAS/FACULTADES (READ) - CORREGIDO
// ==========================================================

/**
 * @route GET /api/faculties
 * @desc Obtiene todas las Facultades/Áreas creadas y asociadas a la IE del Admin.
 */
export const getAllFaculties = async (req, res) => {
    try {
        const institutionId = await getAdminInstitutionId(req);

        if (!institutionId) {
            return res.status(403).json({ message: "El usuario no tiene una institución asignada." });
        }

        // 🚨 CORRECCIÓN CRUCIAL:
        // Filtramos el findMany para incluir SOLO las Facultades cuya FK institution_id
        // coincida con la IE del Admin logueado.
        const faculties = await prisma.faculty.findMany({
            where: { 
                institution_id: institutionId // <-- ¡FILTRADO POR INSTITUCIÓN!
            },
            orderBy: { name: 'asc' },
            // Incluimos el conteo de programas asociados (si es necesario)
            include: {
                programs: {
                    select: { id: true }
                }
            }
        });
        
        // Mapeamos para aplanar y obtener el conteo
        const mappedFaculties = faculties.map(f => ({
            id: f.id,
            name: f.name,
            description: f.description,
            // programsCount ahora solo cuenta los programas que existen BAJO esta facultad
            // y que, por definición, también deben ser de esta institución.
            programsCount: f.programs.length, 
        }));


        return res.status(200).json(mappedFaculties);

    } catch (error) {
        console.error("Error al listar áreas/facultades:", error);
        return res.status(500).json({ message: "Error interno al obtener áreas/facultades." });
    }
};

// ==========================================================
// 🎯 CREAR NUEVA ÁREA/FACULTAD (CREATE)
// (Esta función ya estaba correcta, se mantiene)
// ==========================================================
export const createFaculty = async (req, res) => {
    const { name, description } = req.body;

    try {
        const institutionId = await getAdminInstitutionId(req); 

        if (!institutionId) {
            return res.status(403).json({ message: "Institución no asignada. No se puede crear el área." });
        }

        // Usamos findFirst para verificar si el nombre ya existe DENTRO de esta institución.
        const exists = await prisma.faculty.findFirst({ 
            where: { 
                name: name,
                institution_id: institutionId // Buscamos unicidad local
            } 
        });

        if (exists) {
            return res.status(400).json({ message: "Ya existe un área con ese nombre en tu institución." });
        }
        
        // Incluimos institution_id en la data.
        const newFaculty = await prisma.faculty.create({
            data: { 
                name, 
                description, 
                institution_id: institutionId 
            }
        });

        return res.status(201).json(newFaculty);

    } catch (error) {
        console.error("Error al crear área/facultad:", error);
        if (error.code === 'P2002') { 
             return res.status(400).json({ message: "Ya existe un área con ese nombre en tu institución." });
        }
        return res.status(500).json({ message: "Error interno al crear el área/facultad.", error: error.message });
    }
};

// ==========================================================
// 🎯 ACTUALIZAR ÁREA/FACULTAD (UPDATE)
// ==========================================================
export const updateFaculty = async (req, res) => {
    const { id } = req.params;
    const { name, description } = req.body;
    
    try {
        const institutionId = await getAdminInstitutionId(req);

        // 1. Verificación de propiedad antes de actualizar
        const facultyToUpdate = await prisma.faculty.findUnique({
            where: { id: Number(id) }
        });

        if (!facultyToUpdate || facultyToUpdate.institution_id !== institutionId) {
             return res.status(403).json({ message: "Acceso denegado. Solo puedes editar áreas creadas por tu institución." });
        }
        
        // 2. Actualizar la facultad
        const updatedFaculty = await prisma.faculty.update({
            where: { id: Number(id) },
            data: { name, description },
        });

        return res.status(200).json(updatedFaculty);

    } catch (error) {
        console.error("Error al actualizar área/facultad:", error);
        return res.status(500).json({ message: "Error interno al actualizar el área/facultad." });
    }
};

// ==========================================================
// 🎯 ELIMINAR ÁREA/FACULTAD (DELETE)
// ==========================================================

export const deleteFaculty = async (req, res) => {
    const { id } = req.params;

    try {
        const institutionId = await getAdminInstitutionId(req); 

        // 1. Verificar existencia y pertenencia
        const facultyToDelete = await prisma.faculty.findUnique({
            where: { id: Number(id) }
        });

        if (!facultyToDelete || facultyToDelete.institution_id !== institutionId) {
             return res.status(403).json({ message: "Acceso denegado. Solo puedes eliminar áreas creadas por tu institución." });
        }


        // 2. Verificar dependencias (CRUCIAL)
        const programsCount = await prisma.program.count({
            where: { faculty_id: Number(id) }
        });
        
        if (programsCount > 0) {
            return res.status(400).json({ message: "No se puede eliminar el área/facultad: tiene programas curriculares asociados." });
        }
        
        // 3. Eliminar
        await prisma.faculty.delete({ where: { id: Number(id) } });

        return res.status(200).json({ message: "Área/Facultad eliminada con éxito." });

    } catch (error) {
        if (error.code === 'P2003') {
             return res.status(400).json({ message: "No se puede eliminar el área/facultad: existen dependencias activas." });
        }
        console.error("Error al eliminar área/facultad:", error);
        return res.status(500).json({ message: "Error interno al eliminar el área/facultad." });
    }
};
