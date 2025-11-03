// =========================================================
// !!! PASO CRUCIAL !!!
// Importa e inicializa tu cliente de Prisma
// (Asumiendo que tienes una instancia exportada como 'prisma')
// Ejemplo:
// import prisma from '../config/prisma.js'; 
// O:
import { PrismaClient } from '@prisma/client'; 
const prisma = new PrismaClient(); 
// =========================================================

/**
 * @desc Obtener todas las Instituciones (GET /api/institutions)
 * @access Protegido por authMiddleware
 */
export const getInstitutions = async (req, res) => {
    try {
        const institutions = await prisma.institution.findMany({
            // Puedes incluir relaciones si quieres: include: { plans: true }
            select: {
                id: true,
                name: true,
                code: true,
                address: true, // Usamos 'address' en lugar de 'location'
                email: true,
                phone: true,
                status: true,
            }
        });
        res.status(200).json({
            message: 'Lista de instituciones recuperada exitosamente.',
            data: institutions
        });
    } catch (error) {
        console.error("Error al obtener instituciones:", error);
        res.status(500).json({ message: 'Error interno del servidor al listar instituciones.' });
    }
};

/**
 * @desc Obtener una Institución por ID (GET /api/institutions/:id)
 * @access Protegido por authMiddleware
 */
export const getInstitutionById = async (req, res) => {
    // Los IDs en Prisma son Integers (Int), no strings.
    const id = parseInt(req.params.id); 
    
    try {
        const institution = await prisma.institution.findUnique({
            where: { id: id },
            // Puedes incluir las relaciones aquí si las necesitas para el frontend
            // include: { plans: { select: { id: true, title: true } } }
        });

        if (!institution) {
            return res.status(404).json({ message: `Institución con ID ${id} no encontrada.` });
        }

        res.status(200).json({
            message: `Institución ${id} recuperada.`,
            data: institution
        });
    } catch (error) {
        console.error("Error al obtener institución por ID:", error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};

/**
 * @desc Crear una nueva Institución (POST /api/institutions)
 * @access Protegido por authMiddleware
 */
export const createInstitution = async (req, res) => {
    // Usamos los campos de tu esquema de Prisma (address, no location)
    const { name, code, address, email, phone } = req.body; 

    // Validación obligatoria
    if (!name || !code) {
        return res.status(400).json({ message: 'Faltan campos obligatorios: nombre y código.' });
    }

    try {
        const newInstitution = await prisma.institution.create({
            data: {
                name,
                code,
                address, 
                email,
                phone,
                // status es 'true' por defecto en el esquema.
            }
        });

        res.status(201).json({
            message: 'Institución creada exitosamente.',
            data: newInstitution
        });
    } catch (error) {
        console.error("Error al crear institución:", error);
        // Manejo de error de unicidad (si 'code' ya existe)
        if (error.code === 'P2002') { 
            return res.status(409).json({ message: 'El código de la institución ya existe.' });
        }
        res.status(500).json({ message: 'Error al crear institución.' });
    }
};

/**
 * @desc Actualizar una Institución existente (PUT /api/institutions/:id)
 * @access Protegido por authMiddleware
 */
export const updateInstitution = async (req, res) => {
    const id = parseInt(req.params.id); // Los IDs son Integers
    
    // Solo usamos campos del modelo Institution
    const { name, code, address, email, phone, status } = req.body; 

    const dataToUpdate = {};
    if (name !== undefined) dataToUpdate.name = name;
    if (code !== undefined) dataToUpdate.code = code;
    // Campo corregido: de 'location' a 'address'
    if (address !== undefined) dataToUpdate.address = address; 
    if (email !== undefined) dataToUpdate.email = email;
    if (phone !== undefined) dataToUpdate.phone = phone;
    if (status !== undefined) dataToUpdate.status = status;

    if (Object.keys(dataToUpdate).length === 0) {
        return res.status(400).json({ message: "No hay campos válidos para actualizar." });
    }

    try {
        const updatedInstitution = await prisma.institution.update({
            where: { id: id },
            data: dataToUpdate,
        });

        res.status(200).json({
            message: `Institución ${id} actualizada exitosamente.`,
            data: updatedInstitution
        });
    } catch (error) {
        console.error("Error al actualizar institución:", error);
        // Manejo de error de ID no encontrado (P2025)
        if (error.code === 'P2025') {
            return res.status(404).json({ message: `Institución con ID ${id} no encontrada.` });
        }
        // Manejo de error de unicidad (P2002)
        if (error.code === 'P2002') { 
            return res.status(409).json({ message: 'El código de la institución ya existe.' });
        }

        // Si recibiste el error PrismaClientValidationError antes, probablemente
        // fue debido a que tu JSON incluía campos como 'programs' o 'location'.
        // Con este código, ese error ya no debería ocurrir.
        res.status(500).json({ message: 'Error al actualizar institución.' });
    }
};

/**
 * @desc Eliminar una Institución (DELETE /api/institutions/:id)
 * @access Protegido por authMiddleware
 */
export const deleteInstitution = async (req, res) => {
    const id = parseInt(req.params.id); // Los IDs son Integers

    try {
        await prisma.institution.delete({
            where: { id: id },
        });

        res.status(200).json({ message: `Institución ${id} eliminada exitosamente.` });
    } catch (error) {
        console.error("Error al eliminar institución:", error);
        // Manejo de error de ID no encontrado (P2025)
        if (error.code === 'P2025') {
            return res.status(404).json({ message: `Institución con ID ${id} no encontrada.` });
        }
        res.status(500).json({ message: 'Error al eliminar institución.' });
    }
};